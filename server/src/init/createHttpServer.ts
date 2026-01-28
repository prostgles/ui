import cookieParser from "cookie-parser";
import cors from "cors";
import express, { json, urlencoded } from "express";
import helmet from "helmet";
import _http from "http";
import { upsertNamedExpressMiddleware } from "prostgles-server/dist/Auth/utils/upsertNamedExpressMiddleware";
import { createIOWebsocketServer } from "./createIOWebsocketServer";
import type { CorsOrigin } from "./initExpressAndIOServers";
import { join } from "path";

type CreateHttpServerOptions = {
  port: number;
  socketPath: string;
  allowedOrigin: string | null;
  webAppDirectory: string | null;
  webAppTemplated: boolean | null;
  trustProxy: boolean;
  host?: string;
};

export const createHttpServer = ({
  allowedOrigin,
  socketPath,
  webAppDirectory,
  webAppTemplated,
  port,
  trustProxy,
  host = "127.0.0.1",
}: CreateHttpServerOptions) => {
  const app = express();

  app.set("trust proxy", trustProxy);
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      referrerPolicy: false,
    }),
  );
  app.use(json({ limit: "100mb" }));
  app.use(urlencoded({ extended: true, limit: "100mb" }));
  const http = _http.createServer(app);

  app.use(cookieParser());

  const originCheck: CorsOrigin = {
    origin: (origin, cb) => {
      cb(null, allowedOrigin ?? undefined);
    },
  };
  const corsMiddlewareForConnection = cors({
    ...originCheck,
    credentials: true,
  });
  upsertNamedExpressMiddleware(
    app,
    corsMiddlewareForConnection,
    "corsMiddlewareForConnection",
  );

  if (webAppDirectory) {
    const buildDirectory =
      webAppTemplated ? join(webAppDirectory, "dist") : webAppDirectory;
    app.use(
      express.static(buildDirectory, {
        index: "index.html",
      }),
    );
  }

  http.listen(port, host);

  const { ioConnection } = createIOWebsocketServer({
    socketPath,
    allowedOrigin,
    http,
  });
  return { app, http, ioConnection };
};
