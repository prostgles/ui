import * as crypto from "crypto";
import type { Express } from "express";
import path from "path";
import type {
  AuthConfig,
  BasicSession,
} from "prostgles-server/dist/Auth/AuthTypes";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import type { DB } from "prostgles-server/dist/Prostgles";
import { omitKeys } from "prostgles-types";
import type { DBGeneratedSchema } from "../../../commonTypes/DBGeneratedSchema";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import { BKP_PREFFIX } from "../BackupManager/BackupManager";
import { actualRootDir } from "../electronConfig";
import { PROSTGLES_STRICT_COOKIE } from "../envVars";
import type { DBS, Users } from "../index";
import { connectionChecker, MEDIA_ROUTE_PREFIX } from "../index";
import { initBackupManager } from "../startProstgles";
import { getEmailAuthProvider } from "./emailProvider/getEmailAuthProvider";
import { getActiveSession } from "./getActiveSession";
import { getLogin } from "./getLogin";
import { onMagicLinkOrOTP } from "./onMagicLinkOrOTP";
import { getOAuthLoginProviders } from "./OAuthProviders/getOAuthLoginProviders";
import { API_PATH_SUFFIXES } from "../../../commonTypes/utils";

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
  dbo: DBOFullyTyped<DBGeneratedSchema>,
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
    ("auth_providers");

    return parseAsBasicSession(session);
  } else {
    throw "Invalid user";
  }
};

export type AuthProviders = DBSSchema["global_settings"]["auth_providers"];

export type SUser = {
  sid: string;
  user: Users;
  clientUser: {
    sid: string;
    uid: string;
    state_db_id?: string;
    has_2fa: boolean;
  } & Omit<Users, "password" | "2fa">;
  isAnonymous: boolean;
};
export const sidKeyName = "sid_token" as const;

export const getAuth = async (app: Express, dbs: DBS | undefined) => {
  const { auth_providers } = (await dbs?.global_settings.findOne()) || {};

  const { login } = await getLogin(auth_providers);
  const auth = {
    sidKeyName,
    getUser: async (sid, db, _db: DB, client) => {
      if (!sid) return undefined;

      const { validSession, failedTooManyTimes, error } =
        await getActiveSession(db, {
          type: "session-id",
          client,
          filter: { id: sid },
        });
      if (error) return error;
      if (failedTooManyTimes) return "rate-limit-exceeded";
      if (!validSession) {
        const expiredSession = await db.sessions.findOne({ id: sid });
        if (expiredSession) {
          const user = await db.users.findOne({ id: expiredSession.user_id });
          if (user?.status === "active") {
            return {
              preferredLogin:
                user.registration?.type === "OAuth" ? user.registration.provider
                : user.registration ? "email"
                : user.password ? "email+password"
                : undefined,
            };
          }
        }
        return undefined;
      }

      const user = await db.users.findOne({ id: validSession.user_id });
      if (!user) return undefined;

      const state_db = await db.connections.findOne({ is_state_db: true });
      if (!state_db) {
        return {
          success: false,
          code: "server-error",
          message: "Internal error: Statedb missing ",
        };
      }

      const suser: SUser = {
        sid: validSession.id,
        user,
        isAnonymous: user.type === "public",
        clientUser: {
          sid: validSession.id,
          uid: user.id,

          /** For security reasons provide state_db_id only to admin users */
          state_db_id: user.type === "admin" ? state_db.id : undefined,

          has_2fa: !!user["2fa"]?.enabled,
          ...omitKeys(user, ["password", "2fa"]),
        },
      };

      return suser;
    },

    cacheSession: {
      getSession: async (sid, db) => {
        const s = await db.sessions.findOne({ id: sid });
        if (s) return parseAsBasicSession(s);
        return undefined as any;
      },
    },

    loginSignupConfig: {
      app,

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
      },
      use: connectionChecker.onUse,
      publicRoutes: ["/manifest.json", "/favicon.ico", API_PATH_SUFFIXES.WS],
      onGetRequestOK: async (req, res, { getUser, db, dbo: dbs }) => {
        if (req.path.startsWith(BKP_PREFFIX)) {
          const userData = await getUser();
          await (
            await initBackupManager(db, dbs)
          ).onRequestBackupFile(
            res,
            !userData.user ? undefined : userData,
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
      onMagicLinkOrOTP,
      localLoginMode:
        (
          auth_providers?.email?.signupType === "withMagicLink" &&
          auth_providers.email.enabled
        ) ?
          "email"
        : "email+password",
      signupWithEmail: await getEmailAuthProvider(auth_providers, dbs),
      loginWithOAuth: getOAuthLoginProviders(auth_providers),
    },
  } satisfies AuthConfig<DBGeneratedSchema, SUser>;
  return auth;
};
