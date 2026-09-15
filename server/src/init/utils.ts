import type { RequestHandler } from "express";
import type e from "express";
import type { IncomingMessage, ServerResponse } from "http";
import {
  removeExpressRouteByName,
  upsertNamedExpressMiddleware,
} from "prostgles-server";
import type { ExpressApp } from "prostgles-server/dist/RestApi";
import crypto from "crypto";

export const withSelfAndExtra = (
  directive: string[] | undefined = ["'self'"],
  extra: string[] = [],
) => {
  return [...directive, ...extra];
};

export const withNonce = (
  directive: string[] | undefined,
  extra?: string[],
) => {
  return [
    ...withSelfAndExtra(directive, extra),
    (_req: IncomingMessage, res: ServerResponse) =>
      `'nonce-${(res as unknown as e.Response).locals.cspNonce}'`,
  ];
};

const cspNonceHandlerName = "nonceHandler";
export const setNonceHandler = (app: e.Express, enable: boolean) => {
  if (!enable) {
    removeExpressRouteByName(app as unknown as ExpressApp, cspNonceHandlerName);
    return;
  }
  const nonceHandler: RequestHandler = (_req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(32).toString("hex");
    next();
  };
  upsertNamedExpressMiddleware(app, nonceHandler, cspNonceHandlerName);
};

export const isTesting = !!process.env.PRGL_TEST;
export const IS_DEV = process.env.NODE_ENV === "development";
export const IS_PROD = process.env.NODE_ENV === "production";
