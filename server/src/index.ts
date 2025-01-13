import { logOutgoingHttpRequests } from "./logOutgoingHttpRequests";
logOutgoingHttpRequests(false);

import cookieParser from "cookie-parser";
import type { NextFunction, Request, Response } from "express";
import express, { json, urlencoded } from "express";
import _http from "http";
import path from "path";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import { Server } from "socket.io";
import type { DBGeneratedSchema } from "../../commonTypes/DBGeneratedSchema";
import type { ServerState } from "../../commonTypes/electronInit";
import { isObject } from "../../commonTypes/publishUtils";
import { ConnectionChecker } from "./ConnectionChecker";
import { ConnectionManager } from "./ConnectionManager/ConnectionManager";
import type { OnServerReadyCallback } from "./electronConfig";
import { actualRootDir, getElectronConfig } from "./electronConfig";
import { setDBSRoutesForElectron } from "./setDBSRoutesForElectron";
import {
  getInitState,
  type InitState,
  tryStartProstgles,
} from "./startProstgles";
import { API_PATH_SUFFIXES, SPOOF_TEST_VALUE } from "../../commonTypes/utils";
import helmet from "helmet";
import { omitKeys } from "prostgles-types";

const app = express();
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    referrerPolicy: false,
  }),
);

export const isTesting = !!process.env.PRGL_TEST;
if (isTesting) {
  app.use((req, res, next) => {
    res.on("finish", () => {
      console.log(
        `${new Date().toISOString()} ${req.method} ${res.statusCode} ${req.url} ${res.statusCode === 302 ? res.getHeader("Location") : ""}`,
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
app.use(json({ limit: "100mb" }));
app.use(urlencoded({ extended: true, limit: "100mb" }));
app.use(function (req, res, next) {
  /* data import (papaparse) requires: worker-src blob: 'self' */
  res.setHeader(
    "Content-Security-Policy",
    ` script-src 'self' ${localLLMHeaders}; frame-src 'self'; worker-src blob: 'self';`,
  );
  next();
});

process.on("unhandledRejection", (reason, p) => {
  console.trace("Unhandled Rejection at: Promise", p, "reason:", reason);
});

const http = _http.createServer(app);

export type BareConnectionDetails = Pick<
  Connections,
  | "type"
  | "db_conn"
  | "db_host"
  | "db_name"
  | "db_pass"
  | "db_port"
  | "db_user"
  | "db_ssl"
  | "ssl_certificate"
>;
export type DBS = DBOFullyTyped<DBGeneratedSchema>;
export type Users = Required<DBGeneratedSchema["users"]["columns"]>;
export type Connections = Required<DBGeneratedSchema["connections"]["columns"]>;
export type DatabaseConfigs = Required<
  DBGeneratedSchema["database_configs"]["columns"]
>;

export const log = (msg: string, extra?: any) => {
  console.log(
    ...[`(server): ${new Date().toISOString()} ` + msg, extra].filter((v) => v),
  );
};

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

export const MEDIA_ROUTE_PREFIX = `/prostgles_media`;

export const connectionChecker = new ConnectionChecker(app);

export const dbsWsApiPath = process.env.PRGL_IOPATH || "/ws-api-dbs";
if (
  Object.values(API_PATH_SUFFIXES).some((suffix) =>
    suffix.startsWith(dbsWsApiPath),
  )
) {
  throw new Error(
    `dbsWsApiPath cannot start with: ${Object.values(API_PATH_SUFFIXES)}`,
  );
}
const io = new Server(http, {
  path: dbsWsApiPath,
  maxHttpBufferSize: 100e100,
  cors: connectionChecker.withOrigin,
});

export const connMgr = new ConnectionManager(http, app, connectionChecker);

const electronConfig = getElectronConfig();
const PORT =
  electronConfig ?
    (electronConfig.port ?? 3099)
  : +(process.env.PROSTGLES_UI_PORT ?? 3004);
const LOCALHOST = "127.0.0.1";
const HOST =
  electronConfig ? LOCALHOST : process.env.PROSTGLES_UI_HOST || LOCALHOST;
setDBSRoutesForElectron(app, io, PORT, HOST);

/** Make client wait for everything to load before serving page */
const awaitInit = (): Promise<InitState> => {
  return new Promise((resolve) => {
    const _initState = getInitState();
    if (
      !_initState.loaded &&
      (!_initState.isElectron || _initState.electronCredsProvided)
    ) {
      const interval = setInterval(() => {
        if (getInitState().loaded) {
          resolve(_initState);
          clearInterval(interval);
        }
      }, 200);
    } else {
      resolve(_initState);
    }
  });
};

/**
 * Serve prostglesInitState
 */
app.get("/dbs", (req, res) => {
  const serverState: ServerState = omitKeys(getInitState(), ["dbs"]);
  const electronCreds =
    electronConfig?.isElectron && electronConfig.hasCredentials() ?
      electronConfig.getCredentials()
    : undefined;
  /** Provide credentials if there is a connection error so the user can rectify it */
  if (
    electronCreds &&
    isObject(serverState.connectionError) &&
    req.cookies["sid_token"] === electronConfig?.sidConfig.electronSid
  ) {
    serverState.electronCreds = electronCreds as any;
  }
  /** Alert admin if x-real-ip is spoofable */
  let xRealIpSpoofable = false;
  const { global_setting } = connMgr.connectionChecker.config;
  if (
    req.headers["x-real-ip"] === SPOOF_TEST_VALUE &&
    global_setting?.login_rate_limit_enabled &&
    global_setting.login_rate_limit.groupBy === "x-real-ip"
  ) {
    xRealIpSpoofable = true;
  }
  res.json({ ...serverState, xRealIpSpoofable });
});

/* Must provide index.html if there is an error OR prostgles is loading */
const serveIndexIfNoCredentials = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const {
    isElectron,
    ok,
    electronCredsProvided,
    connectionError,
    initError,
    loading,
  } = getInitState();
  const error = connectionError || initError;
  if (error || (isElectron && !electronCredsProvided) || loading) {
    await awaitInit();
    if (req.method === "GET" && !req.path.startsWith("/dbs")) {
      res.sendFile(path.resolve(actualRootDir + "/../client/build/index.html"));
      return;
    }
  }

  next();
};
app.use(serveIndexIfNoCredentials);

/** Startup procedure
 * If electron:
 *  - serve index
 *  - serve prostglesInitState
 *  - Check for any existing older prostgles schema versions AND allow deleting curr db OR connect to new db
 *  - start prostgles IF or WHEN creds provided
 *  - remove serve index after prostgles is ready
 *
 * If docker/default
 *  - serve index if loading
 *  - serve prostglesInitState
 *  - try start prostgles
 *  - If failed to connect then also serve index
 */
if (electronConfig) {
  const creds = electronConfig.getCredentials();
  if (creds) {
    tryStartProstgles({ app, io, con: creds, port: PORT, host: HOST });
  } else {
    console.log("Electron: No credentials");
  }
  setDBSRoutesForElectron(app, io, PORT, HOST);
} else {
  tryStartProstgles({ app, io, port: PORT, host: HOST, con: undefined });
}

const onServerReadyListeners: OnServerReadyCallback[] = [];
export const onServerReady = async (cb: OnServerReadyCallback) => {
  const _initState = getInitState();
  if (_initState.httpListening) {
    cb(_initState.httpListening.port, _initState.dbs!);
  } else {
    onServerReadyListeners.push(cb);
  }
};

const server = http.listen(PORT, HOST, () => {
  const address = server.address();
  const port = isObject(address) ? address.port : PORT;
  const host = isObject(address) ? address.address : HOST;
  const _initState = getInitState();
  _initState.httpListening = {
    port,
  };

  awaitInit().then(({ dbs }) => {
    onServerReadyListeners.forEach((cb) => {
      cb(port, dbs!);
    });
  });
  console.log(`\n\nexpress listening on port ${port} (${host}:${port})\n\n`);
});

const spawn = require("child_process").spawn;
export function restartProc(cb?: Function) {
  console.warn("Restarting process");
  if (process.env.process_restarting) {
    delete process.env.process_restarting;
    // Give old process one second to shut down before continuing ...
    setTimeout(() => {
      cb?.();
      restartProc();
    }, 1000);
    return;
  }

  // Restart process ...
  spawn(process.argv[0], process.argv.slice(1), {
    env: { process_restarting: 1 },
    stdio: "ignore",
  }).unref();
}

export const tout = (timeout: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, timeout);
  });
};
