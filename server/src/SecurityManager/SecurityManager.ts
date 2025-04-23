import cors from "cors";
import type { Express, Request } from "express";
import { getClientRequestIPsInfo } from "prostgles-server/dist/Auth/AuthHandler";
import type { PRGLIOSocket } from "prostgles-server/dist/DboBuilder/DboBuilderTypes";
import type { DB } from "prostgles-server/dist/Prostgles";
import type { SubscriptionHandler } from "prostgles-types";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import { getElectronConfig } from "../electronConfig";
import type { DBS } from "../index";
import { tableConfig } from "../tableConfig/tableConfig";
import {
  PASSWORDLESS_ADMIN_ALREADY_EXISTS_ERROR,
  securityManagerOnUse,
} from "./SecurityManagerOnUse";
import { activePasswordlessAdminFilter, initUsers } from "./initUsers";
import { getActiveSessionFilter } from "../authConfig/getActiveSession";

export type WithOrigin = {
  origin?: (
    requestOrigin: string | undefined,
    callback: (err: Error | null, origin?: string) => void,
  ) => void;
};

export class SecurityManager {
  static #instance: SecurityManager;
  app: Express;
  passwordlessAdmin?: DBSSchema["users"];
  passwordlessAdminActiveSessionCount?: number;
  dbs?: DBS;
  _db?: DB;

  global_setting: DBSSchema["global_settings"] | undefined;

  usersSub?: SubscriptionHandler;
  configSub?: SubscriptionHandler;
  deletedSidFromCookie?: string;

  private constructor(app: Express) {
    this.app = app;
    app.use(cors(this.withOrigin));
  }
  public static create(app: Express): SecurityManager {
    SecurityManager.#instance ??= new SecurityManager(app);
    return SecurityManager.#instance;
  }

  init = async (db: DBS, _db: DB) => {
    this.dbs = db;
    this._db = _db;
    await this.loadConfig();
  };

  destroy = async () => {
    await this.configSub?.unsubscribe();
    await this.usersSub?.unsubscribe();
  };

  onSocketConnected = async ({ sid }: { sid?: string }) => {
    /** Ensure that only 1 session is allowed for the passwordless admin */
    await this.loadConfig();
    if (this.passwordlessAdmin) {
      const electronConfig = getElectronConfig();

      const pwdLessSession = await this.dbs?.sessions.findOne({
        user_id: this.passwordlessAdmin.id,
        active: true,
      });
      if (pwdLessSession && pwdLessSession.id !== sid) {
        if (
          electronConfig?.isElectron &&
          electronConfig.sidConfig.electronSid === sid
        ) {
          await this.dbs?.sessions.delete({
            user_id: this.passwordlessAdmin.id,
          });
        } else {
          throw PASSWORDLESS_ADMIN_ALREADY_EXISTS_ERROR;
        }
      }
    }
  };

  loadingConfig: Promise<void> | undefined;
  loadConfig = async () => {
    this.loadingConfig ??= loadConfig.bind(this)();
    await this.loadingConfig;
  };

  onUse = securityManagerOnUse.bind(this);

  /**
   * This is mainly used to ensure that when there is passwordless admin access external IPs cannot connect
   */
  checkClientIP = async (
    args: ({ socket: PRGLIOSocket } | { httpReq: Request }) & { dbsTX?: DBS },
  ) => {
    const { ip_address, ip_address_remote, x_real_ip } =
      getClientRequestIPsInfo(args);
    const { groupBy } = this.global_setting?.login_rate_limit ?? {};
    const ipValue =
      groupBy === "x-real-ip" ? x_real_ip
      : groupBy === "remote_ip" ? ip_address_remote
      : ip_address;
    const isAllowed = (await (args.dbsTX || this.dbs)?.sql!(
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
      cb(null, this.global_setting?.allowed_origin ?? undefined);
    },
  };
}

const setupGlobalSettings = async (db: DBS, hasPasswordlessAdmin: boolean) => {
  /** Add cors config if missing */
  if (!(await db.global_settings.count())) {
    await db.global_settings.insert({
      /** Origin "*" is required to enable API access */
      allowed_origin: hasPasswordlessAdmin ? null : "*",
      // allowed_ips_enabled: this.noPasswordAdmin? true : false,
      allowed_ips_enabled: false,
      allowed_ips: ["::ffff:127.0.0.1"],
      tableConfig,
    });
  }
};

const loadConfig = async function (this: SecurityManager): Promise<void> {
  const { dbs: db, _db } = this;
  if (!db) throw "dbs missing";
  if (!_db) throw "_dbs missing";

  await initUsers(db, _db);
  await this.usersSub?.unsubscribe();
  const { sub: usersSub, data: passwordlessAdmin } =
    await resolveSubscriptionData<DBSSchema["users"] | undefined>(
      (resolveData) => {
        return db.users.subscribe(
          activePasswordlessAdminFilter,
          { limit: 1 },
          async ([passwordlessAdmin]) => {
            this.passwordlessAdmin = passwordlessAdmin;
            resolveData(passwordlessAdmin);
          },
        );
      },
    );
  this.usersSub = usersSub;

  if (passwordlessAdmin) {
    const activeSessions = await db.sessions.find(
      getActiveSessionFilter({
        user_id: passwordlessAdmin.id,
      }),
    );
    console.log("Active sessions for passwordless admin: ", activeSessions);
    this.passwordlessAdminActiveSessionCount = activeSessions.length;
  }

  await setupGlobalSettings(db, !!passwordlessAdmin);

  await this.configSub?.unsubscribe();
  const { sub: configSub } = await resolveSubscriptionData((resolveData) => {
    return db.global_settings.subscribeOne({}, {}, async (gconfigs) => {
      this.global_setting = gconfigs;

      this.app.set("trust proxy", this.global_setting?.trust_proxy ?? false);

      // const cidrRequests =  (gconfigs.allowed_ips ?? []).map(cidr =>
      //   db.sql!(
      //     getCIDRRangesQuery({ cidr, returns: ["from", "to"]  }),
      //     { cidr },
      //     { returnType:  "row" }
      //   )
      //  ) as any

      // this.ipRanges = await Promise.all(cidrRequests);

      resolveData(gconfigs);
    });
  });
  this.configSub = configSub;
};

const resolveSubscriptionData = async <D>(
  subInitialisation: (
    dataResolved: (data: D) => void,
  ) => Promise<SubscriptionHandler>,
): Promise<{ sub: SubscriptionHandler; data: D }> => {
  return new Promise(async (resolve, reject) => {
    const sub = await subInitialisation((data) => {
      resolve({ sub, data });
    }).catch((err) => {
      reject(err);
      return Promise.reject(err);
    });
  });
};
