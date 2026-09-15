import { logOutgoingHttpRequests } from "./logOutgoingHttpRequests";
logOutgoingHttpRequests(false);

import { sidKeyName } from "@common/authTypesAndConstants";
import { API_ENDPOINTS } from "@common/utils";
import { getAuthSetupData } from "@src/authConfig/subscribeToAuthSetupChanges";
import cookieParser from "cookie-parser";
import express, { json, urlencoded } from "express";
import _http from "http";
import path from "path";
import { Server } from "socket.io";
import { actualRootDir, DIRECTORIES } from "../electronConfig";
import { includes } from "prostgles-types";
import { isTesting } from "./utils";
import { addDevImageProxyRoute } from "./addDevImageProxyRoute";

export const initExpressAndIOServers = () => {
  const app = express();

  if (isTesting) {
    app.use((req, res, next) => {
      res.on("finish", () => {
        console.log(
          [
            new Date().toISOString(),
            req.headers["x-real-ip"] || req.ip,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            ((req.cookies?.[sidKeyName] as string) || "[undefined] ").slice(
              0,
              10,
            ),
            req.method,
            res.statusCode,
            req.url,
            res.statusCode === 302 ? res.getHeader("Location") : "",
          ].join(" "),
        );
      });
      next();
    });
  }

  app.use(json({ limit: "100mb" }));
  app.use(urlencoded({ extended: true, limit: "100mb" }));

  process.on("unhandledRejection", (reason, p) => {
    console.trace("Unhandled Rejection at: Promise", p, "reason:", reason);
  });

  const http = _http.createServer(app);

  app.use(
    express.static(DIRECTORIES.CLIENT_BUILD, {
      index: false,
      cacheControl: false,
    }),
  );
  app.use(
    "/icons",
    express.static(DIRECTORIES.CLIENT_ICONS, {
      cacheControl: true,
      maxAge: "1y",
      index: false,
      fallthrough: false,
    }),
  );
  app.use(
    express.static(DIRECTORIES.CLIENT_STATIC, {
      cacheControl: true,
      maxAge: "1y",
      index: false,
    }),
  );
  app.use(
    "/screenshots",
    express.static(DIRECTORIES.DOCS_SCREENSHOTS, {
      index: false,
      cacheControl: false,
      fallthrough: false,
    }),
  );

  /** Needed to load MVT tiles worker */
  app.use(
    express.static(
      path.resolve(
        actualRootDir + "/../client/node_modules/@loaders.gl/mvt/dist/",
      ),
      { index: false, extensions: ["js"] },
    ),
  );

  app.use(cookieParser());

  addDevImageProxyRoute(app);

  const io = new Server(http, {
    path: API_ENDPOINTS.WS_DBS,
    maxHttpBufferSize: 100e100,
    cors: {
      origin: (origin, cb) => {
        const { stateDatabaseConfig: database_config } = getAuthSetupData();
        const allowedOrigins = database_config?.cors?.allowedOrigins ?? [];
        const isAllowed =
          (origin && includes(allowedOrigins, origin)) ||
          allowedOrigins.includes("*");
        if (!isAllowed) {
          console.warn(
            `Blocked WS connection from origin: ${origin}. Allowed origins: ${allowedOrigins.join(", ")}`,
          );
        }
        cb(null, isAllowed);
      },
    },
  });

  // Log server-level events
  io.engine.on("connection_error", (err) => {
    console.error("Connection error :", err);
  });

  return {
    app,
    io,
    http,
  };
};
