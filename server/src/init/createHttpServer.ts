import type { DBSSchema } from "@common/publishUtils";
import { getConnectionPaths } from "@common/utils";
import cookieParser from "cookie-parser";
import type e from "express";
import express, { json, urlencoded } from "express";
import _http from "http";
import { join } from "path";
import { createIOWebsocketServer } from "./createIOWebsocketServer";
import {
  setHttpAppSecurity,
  type HttpAppSecurityOptions,
} from "./setHttpAppSecurity";
import { setNonceHandler } from "./utils";

export type CreateHttpServerOptions = {
  port: number;
  socketPath: string;
  host?: string;
  stateAppPort: number;
  connectionPorts: number[];
} & HttpAppSecurityOptions &
  Pick<
    DBSSchema["connections"],
    "web_app_directory" | "web_app_templated" | "is_state_db" | "id"
  >;

export const createHttpServer = (
  {
    socketPath,
    web_app_templated,
    web_app_directory,
    port,
    host = "127.0.0.1",
    stateAppPort,
    is_state_db,
    cors,
    csp,
    cors_csp_devmode_enabled,
    trust_proxy,
    connectionPorts,
    csp_add_defaults_enabled,
    id,
  }: CreateHttpServerOptions,
  stateApp: e.Express,
) => {
  const app = express();

  setHttpAppSecurity(
    app,
    {
      csp,
      cors_csp_devmode_enabled,
      cors,
      trust_proxy,
      csp_add_defaults_enabled,
    },
    { is_state_db, port },
    stateAppPort,
    connectionPorts,
  );
  app.use(json({ limit: "100mb" }));
  app.use(urlencoded({ extended: true, limit: "100mb" }));
  const http = _http.createServer(app);

  app.use(cookieParser());

  if (web_app_directory && !is_state_db) {
    const buildDirectory =
      web_app_templated ?
        join(web_app_directory, "client", "dist")
      : web_app_directory;

    app.use(express.static(buildDirectory));
    /** SPA fallback */
    app.get("*star", (req, res) => {
      res.sendFile(join(buildDirectory, "index.html"));
    });

    if (web_app_templated && cors_csp_devmode_enabled) {
      const testResultsDirectory = join(
        web_app_directory,
        "e2e",
        "playwright-report",
      );
      setNonceHandler(stateApp, true);
      stateApp.use(getConnectionPaths({ id }).webAppTests, (req, res, next) => {
        res.setHeader(
          "Content-Security-Policy",
          `script-src 'unsafe-inline' http://localhost:3004`,
        );

        express.static(testResultsDirectory, {
          fallthrough: true,
          index: "index.html",
        })(req, res, next);
      });
    }
  }

  http.listen(port, host);

  const { ioConnection } = createIOWebsocketServer(
    {
      socketPath,
      cors,
      http,
      cors_csp_devmode_enabled,
    },
    { is_state_db, port },
    stateAppPort,
  );

  return { app, http, ioConnection };
};
