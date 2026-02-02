import type { DBSSchema } from "@common/publishUtils";
import cookieParser from "cookie-parser";
import express, { json, urlencoded } from "express";
import _http from "http";
import { join } from "path";
import { createIOWebsocketServer } from "./createIOWebsocketServer";
import {
  setHttpAppSecurity,
  type HttpAppSecurityOptions,
} from "./setHttpAppSecurity";

export type CreateHttpServerOptions = {
  port: number;
  socketPath: string;
  host?: string;
  stateAppPort: number;
  connectionPorts: number[];
} & HttpAppSecurityOptions &
  Pick<
    DBSSchema["connections"],
    "web_app_directory" | "web_app_templated" | "is_state_db"
  >;

export const createHttpServer = ({
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
}: CreateHttpServerOptions) => {
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

  if (web_app_directory) {
    const buildDirectory =
      web_app_templated ?
        join(web_app_directory, "client", "dist")
      : web_app_directory;

    app.use(express.static(buildDirectory));
    /** SPA fallback */
    app.get("*star", (req, res) => {
      res.sendFile(join(buildDirectory, "index.html"));
    });
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
