import * as crypto from "crypto";
import type { Express } from "express";
import path from "path";
import type {
  Auth,
  AuthClientRequest,
  BasicSession,
  LoginClientInfo,
} from "prostgles-server/dist/Auth/AuthTypes";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import type { DB } from "prostgles-server/dist/Prostgles";
import { type AuthResponse, omitKeys } from "prostgles-types";
import type { DBGeneratedSchema as DBSchemaGenerated } from "../../../commonTypes/DBGeneratedSchema";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import { BKP_PREFFIX } from "../BackupManager/BackupManager";
import { actualRootDir } from "../electronConfig";
import { PROSTGLES_STRICT_COOKIE } from "../envVars";
import type { DBS, Users } from "../index";
import { API_PATH, connectionChecker, MEDIA_ROUTE_PREFIX } from "../index";
import { initBackupManager } from "../startProstgles";
import {
  getAuthEmailProvider,
  getOAuthProviders,
} from "./getAuthEmailProvider";
import { login } from "./login";
import { getFailedTooManyTimes, startLoginAttempt } from "./startLoginAttempt";

export const HOUR = 3600e3;
export const YEAR = 365 * HOUR * 24;

const authCookieOpts =
  process.env.PROSTGLES_STRICT_COOKIE || PROSTGLES_STRICT_COOKIE ?
    {}
  : {
      secure: false,
      sameSite: "lax", //  "none"
    };

export type Sessions = DBSSchema["sessions"];
export const parseAsBasicSession = (s: Sessions): BasicSession => {
  // TODO send sid and set id as hash of sid
  return {
    ...s,
    sid: s.id,
    expires: +s.expires,
    onExpiration: s.type === "api_token" ? "show_error" : "redirect",
  };
};

export const createSessionSecret = () => {
  return crypto.randomBytes(48).toString("hex");
};

export const makeSession = async (
  user: Users | undefined,
  client: Pick<Sessions, "user_agent" | "ip_address" | "type"> & {
    sid?: string;
  },
  dbo: DBOFullyTyped<DBSchemaGenerated>,
  expires = 0,
): Promise<BasicSession> => {
  if (user) {
    const session = await dbo.sessions.insert(
      {
        id: client.sid ?? createSessionSecret(),
        user_id: user.id,
        user_type: user.type,
        expires,
        type: client.type,
        ip_address: client.ip_address,
        user_agent: client.user_agent,
      },
      { returning: "*" },
    );

    return parseAsBasicSession(session);
  } else {
    throw "Invalid user";
  }
};

export type SUser = {
  sid: string;
  user: Users;
  clientUser: {
    sid: string;
    uid: string;
    state_db_id?: string;
    has_2fa: boolean;
  } & Omit<Users, "password" | "2fa">;
};
export const sidKeyName = "sid_token" as const;

type AuthType =
  | {
      type: "session-id";
      filter: { id: string };
      client: AuthClientRequest & LoginClientInfo;
    }
  | {
      type: "login-success";
      filter: { user_id: string; type: "web"; user_agent: string };
    };

export const getActiveSession = async (db: DBS, authType: AuthType) => {
  if (Object.values(authType.filter).some((v) => typeof v !== "string" || !v)) {
    throw `Must provide a valid session filter`;
  }
  const validSession = await db.sessions.findOne({
    ...authType.filter,
    "expires.>": Date.now(),
    active: true,
  });

  /**
   * Always maintain a valid session for passwordless admin
   */
  const pwdlessUser = connectionChecker.noPasswordAdmin;
  // const pwdAdmin = await db.sql(
  //   `SELECT * FROM users WHERE passwordless_admin = true`,
  // );
  // const pwdUsr = await db.users.findOne();
  // if (!pwdlessUser && pwdAdmin.rows.length) {
  //   debugger;
  // }
  if (pwdlessUser && !validSession) {
    const oldSession = await db.sessions.findOne({ user_id: pwdlessUser.id });
    if (oldSession) {
      return db.sessions.update(
        { id: oldSession.id },
        { active: true, expires: Date.now() + 1 * YEAR },
        { returning: "*", multi: false },
      );
    }
  }

  if (!pwdlessUser && authType.type === "session-id" && !validSession) {
    const expiredSession = await db.sessions.findOne({ ...authType.filter });
    if (!expiredSession) {
      const { ip_address, ip_address_remote, user_agent, x_real_ip } =
        authType.client;
      const { failedTooManyTimes } = await startLoginAttempt(
        db,
        { ip_address, ip_address_remote, user_agent, x_real_ip },
        { auth_type: "session-id", sid: authType.filter.id },
      );
      if (failedTooManyTimes) {
        throw "Failed too many times";
      }
    }
  }

  return validSession;
};

export const getAuth = (
  app: Express,
  dbs: DBS | undefined,
  globalSettings?: DBSchemaGenerated["global_settings"]["columns"],
) => {
  const { auth_providers } = globalSettings || {};
  const auth = {
    sidKeyName,
    getUser: async (sid, db, _db: DB, client) => {
      if (!sid) return undefined;

      const s = await getActiveSession(db, {
        type: "session-id",
        client,
        filter: { id: sid },
      });
      if (!s) return undefined;

      const user = await db.users.findOne({ id: s.user_id });
      if (!user) return undefined;

      const state_db = await db.connections.findOne({ is_state_db: true });
      if (!state_db) throw "Internal error: Statedb missing ";

      const suser: SUser = {
        sid: s.id,
        user,
        clientUser: {
          sid: s.id,
          uid: user.id,

          /** For security reasons provide state_db_id only to admin users */
          state_db_id: user.type === "admin" ? state_db.id : undefined,

          has_2fa: !!user["2fa"]?.enabled,
          ...omitKeys(user, ["password", "2fa"]),
        },
      };

      return suser;
    },

    login,

    logout: async (sid, db, _db: DB) => {
      if (!sid) throw "err";
      const s = await db.sessions.findOne({ id: sid });
      if (!s) throw "err";
      const u = await db.users.findOne({ id: s.user_id });

      if (u?.passwordless_admin) {
        throw `Passwordless admin cannot logout`;
      }

      await db.sessions.update({ id: sid }, { active: false });
      /** Keep last 20 sessions */

      return true;
    },

    cacheSession: {
      getSession: async (sid, db) => {
        const s = await db.sessions.findOne({ id: sid });
        if (s) return parseAsBasicSession(s);
        return undefined as any;
      },
    },

    expressConfig: {
      app,
      use: connectionChecker.onUse,
      publicRoutes: ["/manifest.json", "/favicon.ico", API_PATH],
      onGetRequestOK: async (req, res, { getUser, db, dbo: dbs }) => {
        if (req.path.startsWith(BKP_PREFFIX)) {
          const userData = await getUser();
          await (
            await initBackupManager(db, dbs)
          ).onRequestBackupFile(
            res,
            !userData?.user ? undefined : userData,
            req,
          );
        } else if (req.path.startsWith(MEDIA_ROUTE_PREFIX)) {
          req.next?.();

          /* Must be socket io reconnecting */
        } else if (req.query.transport === "polling") {
          req.next?.();
        } else {
          res.sendFile(
            path.resolve(actualRootDir + "/../client/build/index.html"),
          );
        }
      },
      cookieOptions: authCookieOpts,
      onMagicLink: async (
        id,
        dbo,
        _db,
        { ip_address, ip_address_remote, user_agent, x_real_ip },
      ) => {
        const withError = (
          code: AuthResponse.MagicLinkAuthFailure["code"],
        ) => ({
          response: {
            success: false,
            code,
          } satisfies AuthResponse.MagicLinkAuthFailure,
        });
        const onLoginAttempt = await startLoginAttempt(
          dbo,
          { ip_address, ip_address_remote, user_agent, x_real_ip },
          { auth_type: "magic-link", magic_link_id: id },
        );
        if (onLoginAttempt.failedTooManyTimes) {
          return withError("rate-limit-exceeded");
        }
        const mlink = await dbo.magic_links.findOne({ id });

        if (mlink) {
          if (Number(mlink.expires) < Date.now()) {
            return withError("expired-magic-link");
            throw "Expired magic link";
          }
          if (mlink.magic_link_used) {
            return withError("expired-magic-link");
            throw "Magic link already used";
          }
        } else {
          return withError("no-match");
          throw new Error("Magic link not found");
        }

        const user = await dbo.users.findOne({ id: mlink.user_id });
        if (!user) {
          return withError("no-match");
          throw new Error("User from Magic link not found");
        }

        const usedMagicLink = await dbo.magic_links.update(
          { id: mlink.id, magic_link_used: null },
          { magic_link_used: new Date() },
          { returning: "*" },
        );
        if (!usedMagicLink) {
          return withError("no-match");
          throw new Error("Magic link already used");
        }
        const session = await makeSession(
          user,
          {
            ip_address: onLoginAttempt.ip,
            user_agent: user_agent || null,
            type: "web",
          },
          dbo,
          Number(mlink.expires),
        );
        await onLoginAttempt.onSuccess();
        return { session };
      },
      registrations:
        auth_providers ?
          {
            websiteUrl: auth_providers.website_url,
            email: getAuthEmailProvider(auth_providers, dbs),
            OAuthProviders: getOAuthProviders(auth_providers),
            onProviderLoginFail: async ({ clientInfo, dbo, provider }) => {
              // await startLoginAttempt(dbo, clientInfo, {
              //   auth_type: "provider",
              //   auth_provider: provider,
              // });
            },
            onProviderLoginStart: async ({ dbo, clientInfo }) => {
              const check = await getFailedTooManyTimes(dbo as any, clientInfo);
              return check.failedTooManyTimes ?
                  { error: "Too many failed attempts" }
                : { ok: true };
            },
          }
        : undefined,
    },
  } satisfies Auth<DBSchemaGenerated, SUser>;
  return auth;
};
