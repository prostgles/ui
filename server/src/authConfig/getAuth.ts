import cors from "cors";
import type e from "express";
import type { Express } from "express";
import path from "path";
import type { AuthConfig } from "prostgles-server/dist/Auth/AuthTypes";
import { upsertNamedExpressMiddleware } from "prostgles-server/dist/Auth/utils/upsertNamedExpressMiddleware";
import type { DB } from "prostgles-server/dist/Prostgles";
import type { DBGeneratedSchema } from "../../../commonTypes/DBGeneratedSchema";
import { API_ENDPOINTS, ROUTES } from "../../../commonTypes/utils";
import { actualRootDir } from "../electronConfig";
import type { DBS } from "../index";
import { initBackupManager } from "../init/startProstgles";
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
import { type AuthSetupData } from "./subscribeToAuthSetupChanges";

let globalSettings: AuthSetupData["globalSettings"] | undefined;

export const withOrigin: WithOrigin = {
  origin: (origin, cb) => {
    cb(null, globalSettings?.allowed_origin ?? undefined);
  },
};

type WithOrigin = {
  origin?: (
    requestOrigin: string | undefined,
    callback: (err: Error | null, origin?: string) => void,
  ) => void;
};

const setExpressAppOptions = (
  app: e.Express,
  authData: Pick<AuthSetupData, "globalSettings">,
) => {
  globalSettings = authData.globalSettings;

  const corsMiddleware = cors(withOrigin);
  upsertNamedExpressMiddleware(app, corsMiddleware, "corsMiddleware");
  app.set("trust proxy", globalSettings?.trust_proxy ?? false);
};

export type GetAuthResult = Awaited<ReturnType<typeof getAuth>>;

export const getAuth = async (
  app: Express,
  dbs: DBS,
  authSetupData: AuthSetupData,
) => {
  const { globalSettings } = authSetupData;
  setExpressAppOptions(app, { globalSettings });
  const authProviders = globalSettings?.auth_providers;
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

      login: await getLogin(authProviders),

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
          authProviders?.email?.signupType === "withMagicLink" &&
          authProviders.email.enabled
        ) ?
          "email"
        : "email+password",
      signupWithEmail: await getEmailAuthProvider(authProviders, dbs),
      loginWithOAuth: getOAuthLoginProviders(authProviders),
    },
  } satisfies AuthConfig<DBGeneratedSchema, SUser>;
  return auth;
};
