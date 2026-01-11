import cors from "cors";
import type e from "express";
import type { Express } from "express";
import path from "path";
import type { AuthConfig } from "prostgles-server/dist/Auth/AuthTypes";
import { upsertNamedExpressMiddleware } from "prostgles-server/dist/Auth/utils/upsertNamedExpressMiddleware";
import type { DB } from "prostgles-server/dist/Prostgles";
import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { API_ENDPOINTS, ROUTES } from "@common/utils";
import { actualRootDir } from "../electronConfig";
import type { DBS } from "../index";
import { getEmailAuthProvider } from "./emailProvider/getEmailAuthProvider";
import { getLogin } from "./getLogin";
import { getGetUser } from "./getUser";
import { getOAuthLoginProviders } from "./OAuthProviders/getOAuthLoginProviders";
import { onMagicLinkOrOTP } from "./onMagicLinkOrOTP";
import { getOnUseOrSocketConnected } from "./onUseOrSocketConnected";
import {
  authCookieOpts,
  parseAsBasicSession,
  sidKeyName,
  type SUser,
} from "./sessionUtils";
import {
  getAuthSetupData,
  type AuthSetupData,
} from "./subscribeToAuthSetupChanges";
import { initBackupManager } from "@src/init/onProstglesReady";

console.error("TODO: Setup origin for each connection separately");
export const withOrigin: WithOrigin = {
  origin: (origin, cb) => {
    cb(null, getAuthSetupData().database_config?.allowed_origin ?? undefined);
  },
};

type WithOrigin = {
  origin?: (
    requestOrigin: string | undefined,
    callback: (err: Error | null, origin?: string) => void,
  ) => void;
};

const setExpressAppOptions = (app: e.Express, authData: AuthSetupData) => {
  const corsMiddleware = cors(withOrigin);
  upsertNamedExpressMiddleware(app, corsMiddleware, "corsMiddleware");
  app.set("trust proxy", authData.database_config?.trust_proxy ?? false);
};

export type GetAuthResult = Awaited<ReturnType<typeof getAuth>>;

export const getAuth = async (
  app: Express,
  dbs: DBS,
  authSetupData: AuthSetupData,
  connectionAuthBasePath: string | undefined,
) => {
  const { database_config } = authSetupData;
  if (!database_config) return;
  setExpressAppOptions(app, authSetupData);
  const { auth_providers, auth_created_user_type = null } = database_config;
  const auth = {
    sidKeyName,
    onUseOrSocketConnected: getOnUseOrSocketConnected(dbs, authSetupData),
    getUser: getGetUser(authSetupData, dbs),
    cacheSession: {
      getSession: async (sid, _) => {
        if (!sid) return undefined;
        const s = await dbs.sessions.findOne({ id: sid });
        if (!s) return undefined;
        return parseAsBasicSession(s);
      },
    },

    loginSignupConfig: {
      app,
      authRoutesBasePath:
        connectionAuthBasePath && `/${connectionAuthBasePath}`,
      login: await getLogin(database_config),

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
      publicRoutes: [
        "/manifest.json",
        "/favicon.ico",
        "/robots.txt",
        API_ENDPOINTS.WS_DB,
      ],
      onGetRequestOK: async (req, res, { getUser, db, dbo: dbs }) => {
        if (req.path.startsWith(ROUTES.BACKUPS)) {
          const userData = await getUser();
          await (
            await initBackupManager(db, dbs)
          ).onRequestBackupFile(
            res,
            !userData.user ? undefined : userData,
            req,
          );
        } else if (req.path.startsWith(ROUTES.STORAGE)) {
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
      signupWithEmail:
        !auth_providers ? undefined : (
          await getEmailAuthProvider(
            { auth_providers, auth_created_user_type },
            dbs,
          )
        ),
      loginWithOAuth: getOAuthLoginProviders(auth_providers),
    },
  } satisfies AuthConfig<DBGeneratedSchema, SUser>;
  return auth;
};
