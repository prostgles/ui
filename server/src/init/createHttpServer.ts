import cookieParser from "cookie-parser";
import express, { json, urlencoded } from "express";
import helmet from "helmet";
import _http from "http";
export const createHttpServer = (port: number, host = "127.0.0.1") => {
  const app = express();
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
  http.listen(port, host);
  return { app, http };
};
