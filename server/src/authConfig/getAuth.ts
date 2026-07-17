import { sidKeyName } from "@common/authTypesAndConstants";
import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { API_ENDPOINTS, ROUTES } from "@common/utils";
import { getBackupManager } from "@src/init/prostglesOnReady";
import type { Express } from "express";
import path from "path";
import type { AuthConfig } from "prostgles-server/dist/Auth/AuthTypes";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder/DBSchemaBuilder";
import type { DB } from "prostgles-server/dist/Prostgles";
import { actualRootDir } from "../electronConfig";
import type { DBS } from "../index";
import { getEmailAuthProvider } from "./emailProvider/getEmailAuthProvider";
import { getLogin } from "./getLogin";
import { getGetUser } from "./getUser";
import { getOAuthLoginProviders } from "./OAuthProviders/getOAuthLoginProviders";
import { getOnMagicLinkOrOTP } from "./onMagicLinkOrOTP";
import { getOnUseOrSocketConnected } from "./onUseOrSocketConnected";
import {
  authCookieOpts,
  parseAsBasicSession,
  type SUser,
} from "./sessionUtils";
import { type AuthConfigForStateOrConnection } from "./subscribeToAuthSetupChanges";
import { updateRemoteMcpAuthorizationCode } from "@src/McpHub/AnthropicMcpHub/McpOAuth/updateRemoteMcpAuthorizationCode";

export type DBWithAuth = DBOFullyTyped<
  Pick<
    DBGeneratedSchema,
    | "users" // Must sync user id and type to state db to get access control
    | "user_types"
    | "sessions"
    | "login_attempts"
    | "magic_links"
    | "session_types"
    | "user_statuses"
  >
>;

export type GetAuthResult = Awaited<ReturnType<typeof getAuth>>;

export const getAuth = async (
  app: Express,
  dbs: DBS,
  _dbs: DB,
  authSetupData: AuthConfigForStateOrConnection,
) => {
  const database_config =
    authSetupData.type === "state" ?
      authSetupData.stateDatabaseConfig
    : authSetupData.connectionDatabaseConfig;
  const { auth_providers, auth_created_user_type = null } = database_config;
  const auth = {
    sidKeyName,
    onUseOrSocketConnected: getOnUseOrSocketConnected(_dbs, authSetupData),
    getUser: getGetUser(dbs, authSetupData),
    cacheSession: {
      getSession: async (sid, _) => {
        if (!sid) return undefined;
        const session = await dbs.sessions.findOne({ id: sid });
        if (!session) return undefined;
        return parseAsBasicSession(session);
      },
    },

    loginSignupConfig: {
      app,
      // authRoutesBasePath:
      //   authSetupData.type === "connection" && authSetupData.url_path ?
      //     `/${authSetupData.url_path}`
      //   : undefined,
      login: await getLogin(dbs, _dbs, database_config),

      logout: async (sid) => {
        if (!sid) throw "err";
        const s = await dbs.sessions.findOne({ id: sid });
        if (!s) throw "err";
        const u = await dbs.users.findOne({ id: s.user_id });

        if (u?.passwordless_admin) {
          throw `Passwordless admin cannot logout`;
        }

        await dbs.sessions.update({ id: sid }, { active: false });
        /** Keep last 20 sessions */
      },
      publicRoutes: [
        "/manifest.json",
        "/favicon.ico",
        "/robots.txt",
        API_ENDPOINTS.WS_DB,
      ],
      onGetRequestOK: async (req, res, { getUser }) => {
        if (req.path.startsWith(ROUTES.MCP_OAUTH_CALLBACK)) {
          const userData = await getUser();
          if (!userData.user) {
            res.status(401).send("Unauthorized");
            return;
          } else if (userData.user.type !== "admin") {
            res.status(403).send("Forbidden");
            return;
          }

          const result = await updateRemoteMcpAuthorizationCode(dbs, req.query);
          if (result.success === false) {
            res.status(400).send(result.message);
            return;
          }
          const { server_name, mcp_server_config_id } = result;

          res.set("Content-Type", "text/html");
          res.send(`<!DOCTYPE html>
            <html>
              <body>
                <p id="status">Connected MCP server "${server_name}" (config ID: ${mcp_server_config_id}). Closing this window...</p>
                <script src="/mcp-oauth-close.js"></script>
              </body>
            </html>`);
        } else if (req.path.startsWith(ROUTES.PLAYWRIGHT_REPORT)) {
          const userData = await getUser();
          if (!userData.user) {
            res.status(401).send("Unauthorized");
            return;
          } else if (userData.user.type !== "admin") {
            res.status(403).send("Forbidden");
            return;
          }
          req.next?.();
        } else if (req.path.startsWith(ROUTES.BACKUPS)) {
          const userData = await getUser();
          await getBackupManager()!.onRequestBackupFile(
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
      cookieOptions: { ...authCookieOpts, ...database_config.cookie_options },
      onMagicLinkOrOTP: getOnMagicLinkOrOTP(dbs),
      localLoginMode:
        (
          auth_providers?.email?.signupType === "withMagicLink" &&
          auth_providers.email.enabled
        ) ?
          "email"
        : "email+password",
      signupWithEmail:
        !auth_providers ? undefined : (
          await getEmailAuthProvider(dbs, {
            auth_providers,
            auth_created_user_type,
          })
        ),
      loginWithOAuth: getOAuthLoginProviders(dbs, auth_providers),
    },
  } satisfies AuthConfig<DBGeneratedSchema, SUser>;
  return auth;
};
