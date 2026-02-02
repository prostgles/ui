import type { DBSSchema } from "@common/publishUtils";
import cors from "cors";
import type e from "express";
import helmet from "helmet";
import { upsertNamedExpressMiddleware } from "prostgles-server/dist/Auth/utils/upsertNamedExpressMiddleware";
import { getCorsOptions } from "./getCorsOptions";

export type HttpAppSecurityOptions = Pick<
  DBSSchema["database_configs"],
  | "cors"
  | "csp"
  | "cors_csp_devmode_enabled"
  | "trust_proxy"
  | "csp_add_defaults_enabled"
>;

export const setHttpAppSecurity = (
  app: e.Express,
  {
    csp,
    cors: corsSettings,
    trust_proxy,
    cors_csp_devmode_enabled,
    csp_add_defaults_enabled,
  }: HttpAppSecurityOptions,
  { is_state_db, port }: Pick<DBSSchema["connections"], "port" | "is_state_db">,
  stateAppPort: number,
  connectionPorts: number[],
) => {
  app.set("trust proxy", trust_proxy);
  app.disable("x-powered-by");

  const addDevDefaultsToStateConnection = (
    currentValue: undefined | string[] = ["'self'"],
    protocol: "http" | "wss" = "http",
  ) => {
    if (is_state_db && cors_csp_devmode_enabled) {
      return [
        ...currentValue,
        ...connectionPorts.map((port) => `${protocol}://localhost:${port}`),
      ];
    }
    return currentValue;
  };
  const directives = {
    ...csp,

    defaultSrc: addDevDefaultsToStateConnection(csp?.defaultSrc),
    frameAncestors:
      !cors_csp_devmode_enabled || is_state_db ?
        (csp?.frameAncestors ?? ["'self'"])
      : [
          ...(csp?.frameAncestors ?? ["'self'"]),
          /**
           * Allow web apps to be embedded in iframes to be shown in state connection web app config
           * */
          `http://localhost:${stateAppPort}`,
        ],

    /**
     * Allow web apps to be embedded in iframes to be shown in state connection web app config
     */
    frameSrc: addDevDefaultsToStateConnection(csp?.frameSrc),
    connectSrc: addDevDefaultsToStateConnection(csp?.connectSrc, "wss"),
  };

  const cspHandler = helmet({
    crossOriginResourcePolicy: false,
    referrerPolicy: false,
    contentSecurityPolicy: Boolean(
      csp || csp_add_defaults_enabled || cors_csp_devmode_enabled,
    ) && {
      useDefaults: csp_add_defaults_enabled,
      directives,
    },
  });
  upsertNamedExpressMiddleware(app, cspHandler, "helmetCspMiddleware");

  const corsOptions = getCorsOptions(
    { cors: corsSettings, cors_csp_devmode_enabled },
    { is_state_db, port },
    stateAppPort,
  );
  const corsMiddlewareForConnection = cors(corsOptions);
  upsertNamedExpressMiddleware(
    app,
    corsMiddlewareForConnection,
    "corsMiddlewareForConnection",
  );
};
