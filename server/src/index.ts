import { ChildProcessWithoutNullStreams } from "child_process";
import express, { NextFunction, Request, Response, json, urlencoded } from 'express';
import _http from "http";
import path from 'path';
import type { ServerState } from "../../commonTypes/electronInit";
import { isObject } from "../../commonTypes/publishUtils";
import { ConnectionManager } from "./ConnectionManager/ConnectionManager";
import { OnServerReadyCallback, actualRootDir, getElectronConfig } from "./electronConfig";
import { setDBSRoutesForElectron } from "./setDBSRoutesForElectron";
import { getInitState, tryStartProstgles } from "./startProstgles";
import { Server } from "socket.io";
import { ConnectionChecker } from "./ConnectionChecker"; 
import cookieParser from 'cookie-parser';
import { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";

const app = express();

// if(PubSubManager.EXCLUDE_QUERY_FROM_SCHEMA_WATCH_ID !== QUERY_WATCH_IGNORE){
//   throw "Invalid QUERY_WATCH_IGNORE";
// }

export const API_PATH = "/api";

app.use(json({ limit: "100mb" }));
app.use(urlencoded({ extended: true, limit: "100mb" }));
app.use(function (req, res, next) {
  res.setHeader(
    'Content-Security-Policy',
    " script-src 'self'; frame-src 'self'; worker-src blob: 'self';" /* data import (papaparse) requires: worker-src blob: 'self' */
  );
  next();
});

process.on('unhandledRejection', (reason, p) => {
  console.trace('Unhandled Rejection at: Promise', p, 'reason:', reason);
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

const electronConfig = getElectronConfig?.();
let PORT = electronConfig? (electronConfig.port ?? 3099) : +(process.env.PRGL_PORT ?? 3004);
setDBSRoutesForElectron(app, io, PORT);


/** Make client wait for everything to load before serving page */
const awaitInit = () => {
  return new Promise((resolve) => {
    const _initState = getInitState();
    if(_initState && !_initState.loaded && (!_initState.isElectron || _initState.electronCredsProvided)){
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
app.get("/dbs", (req, res) => {
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
      res.sendFile(path.resolve(actualRootDir + '/../client/build/index.html'));
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
    tryStartProstgles({ app, io, con: creds, port: PORT });
  } else {
    console.log("Electron: No credentials");
  }
  setDBSRoutesForElectron(app, io, PORT); 
} else {
  tryStartProstgles({ app, io, port: PORT, con: undefined}); 
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


const server = http.listen(PORT, () => {
  const address = server.address();
  const port = isObject(address)? address.port : PORT;
  const _initState = getInitState();
  _initState.httpListening = {
    port
  };
  onServerReadyListeners.forEach(cb => {
    cb(port)
  })
  console.log(`\n\nexpress listening on port ${port}\n\n`);
});

 
 
/* Get nested property from an object */
export function get(obj: any, propertyPath: string | string[]): any{

  let p = propertyPath,
      o = obj;

  if(!obj) return obj;
  if(typeof p === "string") p = p.split(".");
  return p.reduce((xs, x) =>{ 
    if(xs && xs[x]) { 
      return xs[x] 
    } else {
      return undefined; 
    } 
  }, o);
}


function logProcess(proc: ChildProcessWithoutNullStreams){

  const p = `PID ${proc.pid}`;
  proc.stdout.on('data', function (data: any) {
    console.log(p + ' stdout: ' + data);
  });
  
  proc.stderr.on('data', function (data: any) {
    console.log(p + ' stderr: ' + data);
  });
  
  proc.on('close', function (code: any) {
    console.log(p + ' child process exited with code ' + code);
  });  
}
   
const spawn = require('child_process').spawn;  
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
    stdio: 'ignore'
  }).unref();
}


export const tout = (timeout: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true)
    }, timeout)
  })
}