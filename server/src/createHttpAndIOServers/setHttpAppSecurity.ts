import type { DBSSchema } from "@common/publishUtils";
import cors from "cors";
import type e from "express";
import helmet from "helmet";
import {
  removeExpressRouteByName,
  upsertNamedExpressMiddleware,
} from "prostgles-server";
import type { ExpressApp } from "prostgles-server/dist/RestApi";
import { setNonceHandler, withNonce, withSelfAndExtra } from "../init/utils";
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
    currentValue: undefined | string[],
    protocol: "http" | "wss" = "http",
  ) => {
    const currentValueWithNonce = withNonce(currentValue);
    if (is_state_db && cors_csp_devmode_enabled) {
      return [
        ...currentValueWithNonce,
        ...connectionPorts.map((port) => `${protocol}://localhost:${port}`),
      ];
    }
    return currentValueWithNonce;
  };

  const frameAncestorsWithSelf = withSelfAndExtra(csp?.frameAncestors);
  const frameAncestors =
    !cors_csp_devmode_enabled || is_state_db ?
      frameAncestorsWithSelf
    : [
        ...frameAncestorsWithSelf,
        /**
         * Allow web apps to be embedded in iframes to be shown in state connection web app config
         * */
        `http://localhost:${stateAppPort}`,
      ];

  /**
   * Allow web apps to be embedded in iframes to be shown in state connection web app config
   */
  const frameSrc = [
    ...addDevDefaultsToStateConnection(csp?.frameSrc),
    ...(is_state_db && cors_csp_devmode_enabled ?
      /** Required to show playwright-report test results  */
      [`http://localhost:${stateAppPort}`]
    : []),
  ];
  const directives = {
    ...csp,

    styleSrc: withSelfAndExtra(csp?.styleSrc, ["'unsafe-inline'"]),
    defaultSrc: addDevDefaultsToStateConnection(csp?.defaultSrc),
    frameAncestors,

    frameSrc,
    connectSrc: addDevDefaultsToStateConnection(csp?.connectSrc, "wss"),
  };

  // !getElectronConfig()?.isElectron &&
  const cspEnabled = Boolean(
    csp || csp_add_defaults_enabled || cors_csp_devmode_enabled,
  );

  const cspHelmetMiddlewareHandlerName = "cspHelmetMiddlewareHandler";
  setNonceHandler(app, cspEnabled);
  if (cspEnabled) {
    const cspHandler = helmet({
      crossOriginResourcePolicy: false,
      referrerPolicy: false,
      contentSecurityPolicy: {
        useDefaults: csp_add_defaults_enabled,
        directives,
      },
    });
    upsertNamedExpressMiddleware(
      app,
      cspHandler,
      cspHelmetMiddlewareHandlerName,
    );
  } else {
    removeExpressRouteByName(
      app as unknown as ExpressApp,
      cspHelmetMiddlewareHandlerName,
    );
  }

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
