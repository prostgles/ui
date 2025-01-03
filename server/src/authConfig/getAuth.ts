import * as crypto from "crypto";
import type { Express } from "express";
import path from "path";
import type {
  AuthConfig,
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
  getEmailAuthProvider,
  getOAuthProviders,
} from "./emailProvider/getEmailAuthProvider";
import { getLogin } from "./getLogin";
import {
  getFailedTooManyTimes,
  startRateLimitedLoginAttempt,
} from "./startRateLimitedLoginAttempt";
import { getActiveSession } from "./getActiveSession";

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
      if (!validSession) return undefined;

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
      publicRoutes: ["/manifest.json", "/favicon.ico", API_PATH],
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
      onMagicLink: async (
        id,
        dbo,
        _db,
        { ip_address, ip_address_remote, user_agent, x_real_ip },
      ) => {
        const withError = (
          code: AuthResponse.MagicLinkAuthFailure["code"],
          message?: string,
        ) => ({
          response: {
            success: false,
            code,
            message,
          } satisfies AuthResponse.MagicLinkAuthFailure,
        });
        const rateLimitedAttempt = await startRateLimitedLoginAttempt(
          dbo,
          { ip_address, ip_address_remote, user_agent, x_real_ip },
          { auth_type: "magic-link", magic_link_id: id },
        );
        if ("success" in rateLimitedAttempt) {
          return withError("server-error", rateLimitedAttempt.message);
        }
        if (rateLimitedAttempt.failedTooManyTimes) {
          return withError("rate-limit-exceeded");
        }
        const mlink = await dbo.magic_links.findOne({ id });

        if (!mlink) {
          return withError("no-match");
        }
        if (Number(mlink.expires) < Date.now()) {
          await rateLimitedAttempt.onSuccess();
          return withError("expired-magic-link", "Expired magic link");
        }
        if (mlink.magic_link_used) {
          await rateLimitedAttempt.onSuccess();
          return withError("expired-magic-link", "Magic link already used");
        }
        const user = await dbo.users.findOne({ id: mlink.user_id });
        if (!user) {
          return withError("no-match", "User from Magic link not found");
        }

        /**
         * This is done to prevent multiple logins with the same magic link
         * even if the requests are sent at the same time
         */
        const usedMagicLink = await dbo.magic_links.update(
          { id: mlink.id, magic_link_used: null },
          { magic_link_used: new Date() },
          { returning: "*" },
        );
        if (!usedMagicLink?.length) {
          return withError("used-magic-link", "Magic link already used");
        }
        const session = await makeSession(
          user,
          {
            ip_address: rateLimitedAttempt.ip,
            user_agent: user_agent || null,
            type: "web",
          },
          dbo,
          Number(mlink.expires),
        );
        await rateLimitedAttempt.onSuccess();
        return { session };
      },
      localLoginMode:
        (
          auth_providers?.email?.signupType === "withMagicLink" &&
          auth_providers.email.enabled
        ) ?
          "email"
        : "email+password",
      signupWithEmailAndPassword: await getEmailAuthProvider(
        auth_providers,
        dbs,
      ),
      loginWithOAuth:
        auth_providers && getOAuthProviders(auth_providers) ?
          {
            websiteUrl: auth_providers.website_url,
            OAuthProviders: getOAuthProviders(auth_providers)!,
            onProviderLoginFail: async ({ clientInfo, dbo, provider }) => {
              // await startLoginAttempt(dbo, clientInfo, {
              //   auth_type: "provider",
              //   auth_provider: provider,
              // });
            },
            onProviderLoginStart: async ({ dbo, clientInfo }) => {
              const check = await getFailedTooManyTimes(dbo as any, clientInfo);
              if ("success" in check) return check;
              return check.failedTooManyTimes ?
                  {
                    success: false,
                    code: "rate-limit-exceeded",
                    message: "Too many failed attempts",
                  }
                : { success: true };
            },
          }
        : undefined,
    },
  } satisfies AuthConfig<DBSchemaGenerated, SUser>;
  return auth;
};
