import cors from "cors";
import type { Express, Request } from "express";
import type {
  Auth,
  AuthResult,
  SessionUser,
} from "prostgles-server/dist/Auth/AuthTypes";
import { getClientRequestIPsInfo } from "prostgles-server/dist/Auth/AuthHandler";
import type { DB } from "prostgles-server/dist/Prostgles";
import type { SubscriptionHandler } from "prostgles-types";
import { isDefined, tryCatch, tryCatchV2 } from "prostgles-types";
import type { DBGeneratedSchema as DBSchemaGenerated } from "../../commonTypes/DBGeneratedSchema";
import type { DBSSchema } from "../../commonTypes/publishUtils";
import type { SUser } from "./authConfig/getAuth";
import {
  YEAR,
  getActiveSession,
  makeSession,
  sidKeyName,
} from "./authConfig/getAuth";
import { getPasswordHash } from "./authConfig/authUtils";
import { getElectronConfig } from "./electronConfig";
import { PRGL_PASSWORD, PRGL_USERNAME } from "./envVars";
import type { DBS, Users } from "./index";
import { connMgr, tout } from "./index";
import { tableConfig } from "./tableConfig/tableConfig";
import type { PRGLIOSocket } from "prostgles-server/dist/DboBuilder/DboBuilderTypes";
import { insertDefaultPrompts } from "./publishMethods/askLLM/askLLM";
import { PASSWORDLESS_ADMIN_USERNAME } from "../../commonTypes/OAuthUtils";

export type WithOrigin = {
  origin?: (
    requestOrigin: string | undefined,
    callback: (err: Error | null, origin?: string) => void,
  ) => void;
};

type OnUse = Required<Auth<DBSchemaGenerated, SUser>>["expressConfig"]["use"];

const PASSWORDLESS_ADMIN_ALREADY_EXISTS_ERROR =
  "Only 1 session is allowed for the passwordless admin. If you're seeing this then the passwordless admin session has already been assigned to a different device/browser";
export class ConnectionChecker {
  app: Express;
  constructor(app: Express) {
    this.app = app;

    app.use(cors(this.withOrigin));
  }

  destroy = async () => {
    await this.configSub?.unsubscribe();
    await this.usersSub?.unsubscribe();
  };

  onSocketConnected = async ({ sid }: { sid?: string }) => {
    /** Ensure that only 1 session is allowed for the passwordless admin */
    await this.withConfig();
    if (this.noPasswordAdmin) {
      const electronConfig = getElectronConfig();

      const pwdLessSession = await this.db?.sessions.findOne({
        user_id: this.noPasswordAdmin.id,
        active: true,
      });
      if (pwdLessSession && pwdLessSession.id !== sid) {
        if (
          electronConfig?.isElectron &&
          electronConfig.sidConfig.electronSid === sid
        ) {
          await this.db?.sessions.delete({ user_id: this.noPasswordAdmin.id });
        } else {
          throw PASSWORDLESS_ADMIN_ALREADY_EXISTS_ERROR;
        }
      }
    }
  };

  initialised = {
    users: false,
    config: false,
  };
  withConfig = async () => {
    if (!this.db) throw "dbs missing";

    if (this.config.loaded) return this.config;

    return new Promise(async (resolve, reject) => {
      if (!this.db) throw "dbs missing";

      let resolved = false;
      const initialise = (what: "users" | "config") => {
        if (what === "users") this.initialised.users = true;
        if (what === "config") this.initialised.config = true;
        const { users, config } = this.initialised;
        if (users && config && !resolved) {
          resolved = true;
          resolve(this.config);
        }
      };

      await this.usersSub?.unsubscribe();
      const setNoPasswordAdmin = async () => {
        this.noPasswordAdmin = await getPasswordlessAdmin(this.db!);
        initialise("users");
      };
      await setNoPasswordAdmin();
      let skippedFirst = false;
      this.usersSub = await this.db.users.subscribe(
        {},
        { limit: 1 },
        async () => {
          if (skippedFirst) {
            await setNoPasswordAdmin();
          } else {
            skippedFirst = true;
          }
        },
      );

      await this.configSub?.unsubscribe();
      this.configSub = await this.db.global_settings.subscribeOne(
        {},
        {},
        async (gconfigs) => {
          this.config.global_setting = gconfigs;
          this.config.loaded = true;

          this.app.set(
            "trust proxy",
            this.config.global_setting?.trust_proxy ?? false,
          );

          // const cidrRequests = (gconfigs.allowed_ips ?? []).map(cidr =>
          //   db.sql!(
          //     getCIDRRangesQuery({ cidr, returns: ["from", "to"]  }),
          //     { cidr },
          //     { returnType: "row" }
          //   )
          //  ) as any

          // this.ipRanges = await Promise.all(cidrRequests);

          initialise("config");
        },
      );
    });
  };

  onUse: OnUse = async ({ req, res, next, getUser }) => {
    if (!this.config.loaded || !this.db) {
      console.warn(
        "Delaying user request until server is ready. originalUrl: " +
          req.originalUrl,
      );
      await tout(3000);
      res.redirect(req.originalUrl);
      return;
    }

    const electronConfig = getElectronConfig();
    const sid = req.cookies[sidKeyName];
    if (
      electronConfig?.isElectron &&
      electronConfig.sidConfig.electronSid !== sid
    ) {
      res.json({ error: "Not authorized" });
      return;
    }

    if (!electronConfig?.isElectron) {
      /** Add cors config if missing */
      if (!this.config.global_setting) {
        await this.db.global_settings.insert({
          /** Origin "*" is required to enable API access */
          allowed_origin: this.noPasswordAdmin ? null : "*",
          // allowed_ips_enabled: this.noPasswordAdmin? true : false,
          allowed_ips_enabled: false,
          allowed_ips: Array.from(new Set([req.ip, "::ffff:127.0.0.1"])).filter(
            isDefined,
          ),
          tableConfig,
        });
      }

      const isAccessingMagicLink = req.originalUrl.startsWith("/magic-link/");
      if (this.noPasswordAdmin && !sid && !isAccessingMagicLink) {
        // need to ensure that only 1 session is allowed for the passwordless admin
        const {
          data: magicLinkPaswordless,
          hasError,
          error,
        } = await tryCatchV2(() => getPasswordlessMacigLink(this.db!));
        if (hasError) {
          res.status(401).json({ error });
          return;
        }
        if (magicLinkPaswordless) {
          res.redirect(magicLinkPaswordless);
          return;
        }
      }

      if (this.config.global_setting?.allowed_ips_enabled) {
        const ipCheck = await this.checkClientIP({ httpReq: req });
        if (!ipCheck.isAllowed) {
          res.status(403).json({ error: "Your IP is not allowed" });
          return;
        }
      }

      const publicConnections = connMgr.getConnectionsWithPublicAccess();
      if (publicConnections.length) {
        const isLoggingIn =
          isAccessingMagicLink || req.originalUrl.startsWith("/login");
        const client = getClientRequestIPsInfo({ httpReq: req, res });
        const hasNoActiveSession =
          !sid ||
          !(await getActiveSession(this.db, {
            type: "session-id",
            client,
            filter: { id: sid },
          }));

        /** If test mode and no sid then create a random account and redirect to magic login link */
        if (this._db && hasNoActiveSession && !isLoggingIn) {
          const newRandomUser = await insertUser(this.db, this._db, {
            username: `user-${new Date().toISOString()}_${Math.round(Math.random() * 1e8)}`,
            password: "",
            type: "public",
          });
          if (newRandomUser) {
            const mlink = await makeMagicLink(
              newRandomUser,
              this.db,
              "/",
              Date.now() + DAY * 2,
            );
            res.redirect(mlink.magic_login_link_redirect);
            return;
          }
        }
      }
    }

    next();
  };

  noPasswordAdmin?: DBSSchema["users"];

  // ipRanges: IPRange[] = [];
  db?: DBS;
  _db?: DB;

  config: {
    loaded: boolean;
    global_setting: DBSSchema["global_settings"] | undefined;
  } = {
    loaded: false,
    global_setting: undefined,
  };

  usersSub?: SubscriptionHandler;
  configSub?: SubscriptionHandler;
  init = async (db: DBS, _db: DB) => {
    this.db = db;
    this._db = _db;
    await initUsers(db, _db);
    await this.withConfig();
  };

  /**
   * This is mainly used to ensure that when there is passwordless admin access external IPs cannot connect
   */
  checkClientIP = async (
    args: ({ socket: PRGLIOSocket } | { httpReq: Request }) & { dbsTX?: DBS },
  ) => {
    const { ip_address, ip_address_remote, x_real_ip } =
      getClientRequestIPsInfo(args);
    const { groupBy } = this.config.global_setting?.login_rate_limit ?? {};
    const ipValue =
      groupBy === "x-real-ip" ? x_real_ip
      : groupBy === "remote_ip" ? ip_address_remote
      : ip_address;
    const isAllowed = (await (args.dbsTX || this.db)?.sql!(
      "SELECT inet ${ip} <<= any (allowed_ips::inet[]) FROM global_settings ",
      { ip: ipValue },
      { returnType: "value" },
    )) as boolean;

    return {
      ip: ipValue,
      ip_address,
      ip_address_remote,
      x_real_ip,
      isAllowed, //: (args.byPassedRanges || this.ipRanges).some(({ from, to }) => ip && ip >= from && ip <= to )
    };
  };

  withOrigin: WithOrigin = {
    origin: (origin, cb) => {
      cb(null, this.config.global_setting?.allowed_origin ?? undefined);
    },
  };
}

export const EMPTY_PASSWORD = "";

const NoInitialAdminPasswordProvided = Boolean(
  !PRGL_USERNAME || !PRGL_PASSWORD,
);
export const getPasswordlessAdmin = async (db: DBS) => {
  if (NoInitialAdminPasswordProvided) {
    return await db.users.findOne({
      username: PASSWORDLESS_ADMIN_USERNAME,
      status: "active",
      passwordless_admin: true,
    });
  }
  return undefined;
};

/**
 * If PRGL_USERNAME and PRGL_PASSWORD are specified then create an admin user with these credentials AND allow any IP to connect
 * Otherwise:
 * Create a passwordless admin (PASSWORDLESS_ADMIN_USERNAME, EMPTY_PASSWORD) and allow the first IP to connect
 *  then, the first user to connect must select between these options:
 *    1) Add an account with password (recommended)
 *    2) Continue to allow only the current IP
 *    3) Allow any IP to connect (not recommended)
 *
 */
const initUsers = async (db: DBS, _db: DB) => {
  let username = PRGL_USERNAME,
    password = PRGL_PASSWORD;
  if (NoInitialAdminPasswordProvided) {
    username = PASSWORDLESS_ADMIN_USERNAME;
    password = EMPTY_PASSWORD;
  }

  /**
   * No initial admin user setup. Create a passwordless admin user is required
   */
  if (!(await db.users.count({ username }))) {
    if (NoInitialAdminPasswordProvided) {
      console.warn(
        `PRGL_USERNAME or PRGL_PASSWORD missing. Creating a passwordless admin user: ${username}`,
      );
    }

    try {
      const u = (await db.users.insert(
        {
          username,
          password,
          type: "admin",
          passwordless_admin: Boolean(NoInitialAdminPasswordProvided),
        },
        { returning: "*" },
      )) as Users | undefined;
      if (!u) throw "User not inserted";
      await _db.any(
        "UPDATE users SET password = ${hashedPassword}, status = 'active' WHERE status IS NULL AND id = ${id};",
        { id: u.id, hashedPassword: getPasswordHash(u, "") },
      );
    } catch (e) {
      console.error(e);
    }

    const addedUser = await db.users.find({ username });

    console.warn("Added users: ", addedUser);
  }

  const electron = getElectronConfig();
  if (electron?.isElectron) {
    const user = await getPasswordlessAdmin(db);
    if (!user) throw `Unexpected: Electron passwordless_admin misssing`;
    await db.sessions.delete({});
    await makeSession(
      user,
      {
        ip_address: "::1",
        user_agent: "electron",
        type: "web",
        sid: electron.sidConfig.electronSid,
      },
      db,
      Date.now() + 10 * YEAR,
    );
    electron.sidConfig.onSidWasSet();
  }
};

export const insertUser = async (
  db: DBS,
  _db: DB,
  u: Parameters<typeof db.users.insert>[0] & { password: string },
) => {
  const user = (await db.users.insert(u, { returning: "*" })) as Users;
  if (!user.id) throw "User id missing";
  if (typeof user.password !== "string") throw "Password missing";
  const hashedPassword = getPasswordHash(user, user.password);
  await _db.any(
    "UPDATE users SET password = ${hashedPassword} WHERE id = ${id};",
    { id: user.id, hashedPassword },
  );
  return db.users.findOne({ id: user.id })!;
};

export const DAY = 24 * 3600 * 1000;
export const makeMagicLink = async (
  user: Users,
  dbo: DBS,
  returnURL: string,
  expires?: number,
) => {
  const maxDays =
    (await dbo.global_settings.findOne())?.magic_link_validity_days ?? 2;
  const mlink = await dbo.magic_links.insert(
    {
      expires: expires ?? Date.now() + DAY * maxDays,
      user_id: user.id,
    },
    { returning: "*" },
  );

  return {
    id: user.id,
    magicLinkId: mlink.id,
    magic_login_link_redirect: `/magic-link/${mlink.id}?returnURL=${returnURL}`,
  };
};

const getPasswordlessMacigLink = async (dbs: DBS) => {
  /** Create session for passwordless admin */
  const u = await getPasswordlessAdmin(dbs);
  if (u) {
    const existingLink = await dbs.magic_links.findOne({
      user_id: u.id,
      "magic_link_used.<>": null,
    });
    if (existingLink) throw PASSWORDLESS_ADMIN_ALREADY_EXISTS_ERROR;
    const mlink = await makeMagicLink(u, dbs, "/", Date.now() + 10 * YEAR);

    return mlink.magic_login_link_redirect;
  }

  return undefined;
};
