import cookieParser from "cookie-parser";
import type { NextFunction, Request, Response } from "express";
import express, { json, urlencoded } from "express";
import _http from "http";
import path from "path";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import { Server } from "socket.io";
import type { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import type { ServerState } from "../../commonTypes/electronInit";
import { isObject } from "../../commonTypes/publishUtils";
import { ConnectionChecker } from "./ConnectionChecker";
import { ConnectionManager } from "./ConnectionManager/ConnectionManager";
import type { OnServerReadyCallback } from "./electronConfig";
import { actualRootDir, getElectronConfig } from "./electronConfig";
import { setDBSRoutesForElectron } from "./setDBSRoutesForElectron";
import { getInitState, tryStartProstgles } from "./startProstgles";

const app = express();

// if(process.env.PRGL_TEST){
  app.use((req, res, next) => {
    res.on("finish", () => {
      console.log(`${(new Date()).toISOString()} ${req.method} ${res.statusCode} ${req.url} ${res.statusCode === 302? res.getHeader("Location") : ""}`);
    });
    next();
  });
// }

export const API_PATH = "/api";
 
app.use(json({ limit: "100mb" }));
app.use(urlencoded({ extended: true, limit: "100mb" }));
app.use(function (req, res, next) {
  /* data import (papaparse) requires: worker-src blob: 'self' */
  res.setHeader(
    "Content-Security-Policy",
    " script-src 'self'; frame-src 'self'; worker-src blob: 'self';" 
  );
  next();
});

process.on("unhandledRejection", (reason, p) => {
  console.trace("Unhandled Rejection at: Promise", p, "reason:", reason);
});

const http = _http.createServer(app);
 
export type BareConnectionDetails = Pick<Connections, "type" | "db_conn" | "db_host" | "db_name" | "db_pass" | "db_port" | "db_user" | "db_ssl" | "ssl_certificate">
export type DBS = DBOFullyTyped<DBSchemaGenerated>;
export type Users = Required<DBSchemaGenerated["users"]["columns"]>; 
export type Connections = Required<DBSchemaGenerated["connections"]["columns"]>; 
export type DatabaseConfigs = Required<DBSchemaGenerated["database_configs"]["columns"]>; 

export const log = (msg: string, extra?: any) => {
  console.log(...[`(server): ${(new Date()).toISOString()} ` + msg, extra].filter(v => v));
}

app.use(express.static(path.resolve(actualRootDir + "/../client/build"), { index: false }));
app.use(express.static(path.resolve(actualRootDir + "/../client/static"), { index: false }));
 

app.use(cookieParser());

export const MEDIA_ROUTE_PREFIX = `/prostgles_media`; 

export const connectionChecker = new ConnectionChecker(app);


const ioPath = process.env.PRGL_IOPATH || "/iosckt";
const io = new Server(http, { 
  path: ioPath, 
  maxHttpBufferSize: 100e100,
  cors: connectionChecker.withOrigin
});
 
export const connMgr = new ConnectionManager(http, app, connectionChecker.withOrigin);

const electronConfig = getElectronConfig();
const PORT = electronConfig? (electronConfig.port ?? 3099) : +(process.env.PROSTGLES_UI_PORT ?? 3004);
const LOCALHOST = "127.0.0.1"
const HOST = electronConfig? LOCALHOST : (process.env.PROSTGLES_UI_HOST || LOCALHOST);
setDBSRoutesForElectron(app, io, PORT, HOST);


/** Make client wait for everything to load before serving page */
const awaitInit = () => {
  return new Promise((resolve) => {
    const _initState = getInitState();
    if(!_initState.loaded && (!_initState.isElectron || _initState.electronCredsProvided)){
      const interval = setInterval(() => {
        if(getInitState().loaded){
          resolve(_initState);
          clearInterval(interval);
        }
      }, 200)
    } else {   
      resolve(_initState);
    }
  });
}


/**
 * Serve prostglesInitState
 */
app.get("/dbs", (_req, res) => {
  const serverState: ServerState = getInitState()
  res.json(serverState);
});

/* Must provide index.html if there is an error OR prostgles is loading */
const serveIndexIfNoCredentials = async (req: Request, res: Response, next: NextFunction) => {

  const { isElectron, ok, electronCredsProvided, connectionError, initError, loading } = getInitState();
  const error = connectionError || initError;
  if(error || isElectron && !electronCredsProvided || loading){
    await awaitInit();
    if(req.method === "GET" && !req.path.startsWith("/dbs")){
      res.sendFile(path.resolve(actualRootDir + "/../client/build/index.html"));
      return;
    }
  }

  next();
}
app.use(serveIndexIfNoCredentials)

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
if(electronConfig){   
  const creds = electronConfig.getCredentials();
  if(creds){
    tryStartProstgles({ app, io, con: creds, port: PORT, host: HOST });
  } else {
    console.log("Electron: No credentials");
  }
  setDBSRoutesForElectron(app, io, PORT, HOST); 
} else {
  tryStartProstgles({ app, io, port: PORT, host: HOST, con: undefined}); 
}
 

const onServerReadyListeners: OnServerReadyCallback[] = [];
export const onServerReady = async (cb: OnServerReadyCallback) => {
  const _initState = getInitState();
  if(_initState.httpListening){
    cb(_initState.httpListening.port)
  } else {
    onServerReadyListeners.push(cb);
  }
}


const server = http.listen(PORT, HOST, () => {
  const address = server.address();
  const port = isObject(address)? address.port : PORT;
  const host = isObject(address)? address.address : HOST;
  const _initState = getInitState();
  _initState.httpListening = {
    port
  };
  onServerReadyListeners.forEach(cb => {
    cb(port)
  });
  console.log(`\n\nexpress listening on port ${port} (${host}:${port})\n\n`);
});
   
const spawn = require("child_process").spawn;  
export function restartProc(cb?: Function){
  console.warn("Restarting process")
  if (process.env.process_restarting) { 
    delete process.env.process_restarting;
    // Give old process one second to shut down before continuing ...
    setTimeout(() => {
      cb?.()
      restartProc()
    }, 1000);
    return;  
  }   
  
  // Restart process ...
  spawn(process.argv[0], process.argv.slice(1), {
    env: { process_restarting: 1 },
    stdio: "ignore"
  }).unref();
}


export const tout = (timeout: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true)
    }, timeout)
  })
}