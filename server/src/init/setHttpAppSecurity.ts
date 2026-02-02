import type { DBSSchema } from "@common/publishUtils";
import cors from "cors";
import crypto from "crypto";
import type e from "express";
import type { RequestHandler } from "express";
import helmet from "helmet";
import type { IncomingMessage, ServerResponse } from "http";
import {
  removeExpressRouteByName,
  upsertNamedExpressMiddleware,
} from "prostgles-server/dist/Auth/utils/upsertNamedExpressMiddleware";
import { getCorsOptions } from "./getCorsOptions";
import { getElectronConfig } from "@src/electronConfig";
import type { ExpressApp } from "prostgles-server/dist/RestApi";

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

  const withSelfAndExtra = (
    directive: string[] | undefined = ["'self'"],
    extra: string[] = [],
  ) => {
    return [...directive, ...extra];
  };
  const withNonce = (directive: string[] | undefined, extra?: string[]) => {
    return [
      ...withSelfAndExtra(directive, extra),
      (_req: IncomingMessage, res: ServerResponse) =>
        `'nonce-${(res as unknown as e.Response).locals.cspNonce}'`,
    ];
  };
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

  const frameAncestors = csp?.frameAncestors ?? ["'self'"];
  const directives = {
    ...csp,

    styleSrc: withSelfAndExtra(csp?.styleSrc, ["'unsafe-inline'"]),
    defaultSrc: addDevDefaultsToStateConnection(csp?.defaultSrc),
    frameAncestors:
      !cors_csp_devmode_enabled || is_state_db ? frameAncestors : (
        [
          ...frameAncestors,
          /**
           * Allow web apps to be embedded in iframes to be shown in state connection web app config
           * */
          `http://localhost:${stateAppPort}`,
        ]
      ),

    /**
     * Allow web apps to be embedded in iframes to be shown in state connection web app config
     */
    frameSrc: addDevDefaultsToStateConnection(csp?.frameSrc),
    connectSrc: addDevDefaultsToStateConnection(csp?.connectSrc, "wss"),
  };

  const cspEnabled =
    !getElectronConfig()?.isElectron &&
    Boolean(csp || csp_add_defaults_enabled || cors_csp_devmode_enabled);

  const cspNonceHandlerName = "nonceHandler";
  const cspHelmetMiddlewareHandlerName = "cspHelmetMiddlewareHandler";
  if (cspEnabled) {
    const nonceHandler: RequestHandler = (_req, res, next) => {
      res.locals.cspNonce = crypto.randomBytes(32).toString("hex");
      next();
    };
    upsertNamedExpressMiddleware(app, nonceHandler, cspNonceHandlerName);
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
    removeExpressRouteByName(app as unknown as ExpressApp, cspNonceHandlerName);
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
