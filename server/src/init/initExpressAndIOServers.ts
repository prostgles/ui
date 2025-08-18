import { logOutgoingHttpRequests } from "./logOutgoingHttpRequests";
logOutgoingHttpRequests(false);

import cookieParser from "cookie-parser";
import express, { json, urlencoded } from "express";
import helmet from "helmet";
import _http from "http";
import path from "path";
import { Server } from "socket.io";
import { API_ENDPOINTS } from "../../../common/utils";
import { withOrigin } from "../authConfig/getAuth";
import { sidKeyName } from "../authConfig/sessionUtils";
import { actualRootDir } from "../electronConfig";

export const isTesting = !!process.env.PRGL_TEST;
export const initExpressAndIOServers = () => {
  const app = express();
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      referrerPolicy: false,
    }),
  );

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

  /**
   * Required to ensure xenova/transformators works
   */
  const localLLMHeaders = ""; // `'unsafe-eval' 'wasm-unsafe-eval'`;
  // console.error("REMOVE CSP", localLLMHeaders);
  const renderPDFinIframe = `data: blob:`;
  app.use(json({ limit: "100mb" }));
  app.use(urlencoded({ extended: true, limit: "100mb" }));
  app.use(function (req, res, next) {
    /* data import (papaparse) requires: worker-src blob: 'self' */
    res.setHeader(
      "Content-Security-Policy",
      ` script-src 'self' ${localLLMHeaders}; frame-src 'self' ${renderPDFinIframe} ; worker-src blob: 'self';`,
    );
    next();
  });

  process.on("unhandledRejection", (reason, p) => {
    console.trace("Unhandled Rejection at: Promise", p, "reason:", reason);
  });

  const http = _http.createServer(app);

  app.use(
    express.static(path.resolve(actualRootDir + "/../client/build"), {
      index: false,
      cacheControl: false,
    }),
  );
  app.use(
    express.static(path.resolve(actualRootDir + "/../client/static"), {
      index: false,
      cacheControl: false,
    }),
  );
  app.use(
    express.static(path.resolve(actualRootDir + "/../docs"), {
      index: false,
      cacheControl: false,
    }),
  );
  app.use(
    express.static("/icons", {
      cacheControl: true,
      index: false,
      maxAge: 31536000,
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

  const io = new Server(http, {
    path: API_ENDPOINTS.WS_DBS,
    maxHttpBufferSize: 100e100,
    cors: withOrigin,
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
