import path from 'path';
import express, { NextFunction, Request, RequestHandler, Response } from 'express';
import prostgles from "prostgles-server";
import { tableConfig } from "./tableConfig";
const app = express();
import { publishMethods } from "./publishMethods";
import { ChildProcessWithoutNullStreams } from "child_process";
import { ConnectionManager, Unpromise } from "./ConnectionManager";
import { getAuth } from "./authConfig";
import { DBSConnectionInfo, getElectronConfig, ROOT_DIR } from "./electronConfig";


export const API_PATH = "/api";


app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// app.use((req, res, next) => {
//   console.log(req.originalUrl);
//   next()
// })
// use it before all route definitions

import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
// console.log("Connecting to state database" , process.env)

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});


import _http from "http";
const http = _http.createServer(app);

const ioPath = process.env.PRGL_IOPATH || "/iosckt";



import { publish } from "./publish"
// const dns = require('dns');
export type BareConnectionDetails = Pick<Connections, "type" | "db_conn" | "db_host" | "db_name" | "db_pass" | "db_port" | "db_user" | "db_ssl" | "ssl_certificate">


const dotenv = require('dotenv');
export type DBS = DBOFullyTyped<DBSchemaGenerated>

import { testDBConnection } from "./connectionUtils/testDBConnection";
import { validateConnection } from "./connectionUtils/validateConnection";

const result = dotenv.config({ path: path.resolve(ROOT_DIR+'/../.env') })
export const {
  PRGL_USERNAME,
  PRGL_PASSWORD,

  POSTGRES_URL,
  POSTGRES_DB,
  POSTGRES_HOST,
  POSTGRES_PASSWORD,
  POSTGRES_PORT,
  POSTGRES_USER,
  POSTGRES_SSL,
  PROSTGLES_STRICT_COOKIE,
} = result?.parsed || {};


export type Users = Required<DBSchemaGenerated["users"]["columns"]>; 
export type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
import { DB } from 'prostgles-server/dist/Prostgles';

export const log = (msg: string, extra?: any) => {
  console.log(...[`(server): ${(new Date()).toISOString()} ` + msg, extra].filter(v => v));
}

app.use(express.static(path.resolve(ROOT_DIR + "/../client/build"), { index: false }));
app.use(express.static(path.resolve(ROOT_DIR + "/../client/static"), { index: false }));

 
/* AUTH */ 
import cookieParser from 'cookie-parser';
import { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";

app.use(cookieParser());

export const MEDIA_ROUTE_PREFIX = `/prostgles_media`;

const DBS_CONNECTION_INFO: DBSConnectionInfo = {
  type: !(process.env.POSTGRES_URL || POSTGRES_URL)? "Standard" : "Connection URI",
  db_conn: process.env.POSTGRES_URL || POSTGRES_URL, 
  db_name: process.env.POSTGRES_DB || POSTGRES_DB, 
  db_user: process.env.POSTGRES_USER || POSTGRES_USER, 
  db_pass: process.env.POSTGRES_PASSWORD || POSTGRES_PASSWORD, 
  db_host: process.env.POSTGRES_HOST || POSTGRES_HOST, 
  db_port: process.env.POSTGRES_PORT || POSTGRES_PORT, 
  db_ssl:  process.env.POSTGRES_SSL || POSTGRES_SSL,
};

import { omitKeys, pickKeys } from "prostgles-server/dist/PubSubManager";


import BackupManager, { Backups } from "./BackupManager";
let bkpManager: BackupManager;

export const getBackupManager = () => bkpManager;


import { ConnectionChecker } from "./ConnectionChecker";
export const connectionChecker = new ConnectionChecker(app);

import { Server }  from "socket.io";
const io = new Server(http, { 
  path: ioPath, 
  maxHttpBufferSize: 100e100,
  cors: connectionChecker.withOrigin
});


export const connMgr = new ConnectionManager(http, app, connectionChecker.withOrigin);


const startProstgles = async (con = DBS_CONNECTION_INFO) => {
  try {
    
    // console.log("Connecting to state database" , con, { POSTGRES_DB, POSTGRES_USER, POSTGRES_HOST }, process.env)

    if(!con.db_conn && !con.db_user && !con.db_name){
      console.trace(con)
      throw `
        Make sure .env file contains superuser postgres credentials:
          POSTGRES_URL
          or
          POSTGRES_DB
          POSTGRES_USER

        Example:
          POSTGRES_USER=myusername 
          POSTGRES_PASSWORD=exampleText 
          POSTGRES_DB=mydatabase 
          POSTGRES_HOST=exampleText 
          POSTGRES_PORT=exampleText

        To create a superuser and database on linux:
          sudo -su postgres createuser -P --superuser myusername
          sudo -su postgres createdb mydatabase -O myusername

      `;
    }
    
    await testDBConnection(con as any, true);

    const auth = getAuth(app);
    await prostgles<DBSchemaGenerated>({
      dbConnection: {
        connectionTimeoutMillis: 1000, 
        host: con.db_host!,
        port: +con.db_port! || 5432,
        database: con.db_name!,
        user: con.db_user!,
        password:  con.db_pass!,
      },
      sqlFilePath: path.join(ROOT_DIR+'/src/init.sql'),
      io,
      tsGeneratedTypesDir: path.join(ROOT_DIR + '/../commonTypes/'),
      transactions: true,
      onSocketConnect: async ({ socket, dbo, db, getUser }) => {
        
        const user = await getUser();
        const sid = user?.sid
        if(sid){
          dbo.sessions.update({ id: sid }, { is_connected: true })
        }
        const remoteAddress = (socket as any)?.conn?.remoteAddress;
        log("onSocketConnect", { remoteAddress });

        await connectionChecker.onSocketConnected(sid);

        // await db.any("ALTER TABLE workspaces ADD COLUMN deleted boolean DEFAULT FALSE")
        const wrkids =  await dbo.workspaces.find({ deleted: true }, { select: { id: 1 }, returnType: "values" });
        const wkspsFilter: Parameters<typeof dbo.windows.find>[0] = wrkids.length? { workspace_id: { $in: wrkids } } : {};
        const wids = await dbo.windows.find({ $or: [
          { deleted: true }, 
          { closed: true },
          wkspsFilter
        ] }, { select: { id: 1 }, returnType: "values" });

        if(wids.length){
          await dbo.links.delete({ $or: [
            { w1_id: { $in: wids } }, 
            { w2_id: { $in: wids } },
            { deleted: true }
          ] })
          await dbo.windows.delete({ $or: [ { deleted: true }, wkspsFilter] });
          await dbo.workspaces.delete({ deleted: true });
        }
        
      },
      onSocketDisconnect: async ({ dbo, getUser }) => {
        const user = await getUser();
        const sid = user?.sid
        if(sid){
          dbo.sessions.update({ id: sid }, { is_connected: false })
        }
      },
      
      // DEBUG_MODE: true,
      tableConfig,
      publishRawSQL: async (params) => {
        const { user } = params
        return Boolean(user && user.type === "admin")
      },
      auth,
      publishMethods,
      publish: params => publish(params, con) as any,
      joins: "inferred",
      onReady: async (db, _db: DB) => {
        // db.backups.update({}, {restore_options: { "clean": true }});

        await insertStateDatabase(db, _db, con);

        await connectionChecker.init(db, _db);

        await connMgr.init(db);
        bkpManager ??= new BackupManager(db, connMgr);


        console.log("Prostgles UI is running on port ", PORT)
      },  
    });
  } catch(err){
    throw err;
  }
}


  /** Add state db if missing */
const insertStateDatabase = async (db: DBS, _db: DB, con: typeof DBS_CONNECTION_INFO) => {

  if(!(await db.connections.count())){ // , name: "Prostgles state database" // { user_id }
    const state_db = await upsertConnection({  
      ...con,
      user_id: null, 
      name: "Prostgles state database", 
      type: !con.db_conn? 'Standard' : 'Connection URI',
      db_port: con.db_port || 5432,
      db_ssl: con.db_ssl || "disable",
      is_state_db: true,      
    } as any, null, db);

    try {
      const SAMPLE_DB_LABEL = "Sample database";
      const SAMPLE_DB_NAME = "sample_database";
      const databases: string[] = await _db.any(`SELECT datname FROM pg_database WHERE datistemplate = false;`)
      if(! (await db.connections.findOne({ name: SAMPLE_DB_LABEL, db_name: SAMPLE_DB_NAME })) ){
        if(!state_db) throw "state_db not found";

        if(!databases.includes(SAMPLE_DB_NAME)) {
          await _db.any("CREATE DATABASE " + SAMPLE_DB_NAME);
        }
        await upsertConnection({ 
          ...omitKeys(state_db, ["id"]),
          is_state_db: false,
          name: SAMPLE_DB_LABEL,
          db_name: SAMPLE_DB_NAME,
        }, null, db)
      }
    } catch(err: any){
      console.error("Failed to create sample database: ", err)
    }
  }
}

import type { ProstglesInitState } from "../../commonTypes/electronInit";
console.log("REMOVE")

let _initState: {
  error?: any;
  ok: boolean;
} = {
  ok: false
}
const getInitState = () => ({
  ...getElectronConfig?.(),
  ..._initState,
});


const tryStartProstgles = async (con: DBSConnectionInfo = DBS_CONNECTION_INFO) => {
  let tries = 0;

  _initState.error = null;
  let interval = setInterval(async () => {
    
    try {
      await startProstgles(con);
      console.log("startProstgles success! ")
      tries = 6;
      _initState.error = null;
      // clearInterval(interval)
    } catch(err){
      console.error("startProstgles fail: ", err)
      _initState.error = err;
      tries++;
    }
    
    _initState.ok = !_initState.error;

    if(tries > 5){
      clearInterval(interval);
      
      setDBSRoutes(!!_initState.error);
      return
    }

  }, 2000);

}

/**
 * Serve prostglesInitState
 */
app.get("/dbs", (req, res) => {
  res.json(getInitState())
});

// const serveIndexFunc: RequestHandler = (req, res) => {
//   if(prostglesInitState.isElectron && prostglesInitState.ok){
//     // routes.forEach(route => {
//     //   console.log(route.handle.name)
//     // });
//   }
//   const routes: any[] = app._router.stack;
//   const idx = routes.findIndex((s: any) => s.handle === serveIndexFunc )
//   console.log({ idx, routes });
//   res.sendFile(path.resolve(ROOT_DIR + '/../client/build/index.html'));
// }

const sendIndexIfNoCredentials = (req: Request, res: Response, next: NextFunction) => {

  const { isElectron, ok, hasCredentials, error } = getInitState();
  if(error || isElectron && !hasCredentials){
    if(req.method === "GET" && !req.path.startsWith("/dbs")){
      console.log(req.method, req.path);
      res.sendFile(path.resolve(ROOT_DIR + '/../client/build/index.html'));
      return;
    }
  }

  next();
}

app.use(sendIndexIfNoCredentials)

const setDBSRoutes = (serveIndex: boolean) => {

  // if(serveIndex){
  //   app.get("*", serveIndexFunc);
  // }

  if(!getInitState().isElectron) return;

  app.post("/dbs", async (req, res) => {
    const creds = pickKeys(req.body, ["db_conn", "db_user", "db_pass", "db_host", "db_port", "db_name", "db_ssl", "type"]);

    if(req.body.validate){
      try {
        const connection = validateConnection(creds)
        res.json({ connection });

      } catch(warning){
        res.json({ warning })
      }
      return;
    }

    if(!creds.db_conn || !creds.db_host){
      res.json({ warning: "db_conn or db_host Missing" });
      return
    }
  
    try {
      await testDBConnection(creds);
      const electronConfig = getElectronConfig?.();
      electronConfig?.setCredentials(creds);
      tryStartProstgles(creds);
      res.json({ msg: "DBS changed. Restart system" });
    } catch(warning){
      res.json({ warning })
    }
  });
}


/** Startup procedure
 * If electron:
 *  - serve index
 *  - serve prostglesInitState
 *  - start prostgles IF or WHEN creds provided
 *  - remove serve index after prostgles is ready
 * 
 * If docker/default
 *  - serve prostglesInitState
 *  - try start prostgles
 *  - If failed to connect then also serve index 
 */

let PORT = +(process.env.PRGL_PORT ?? 3004)


// let electronConfig = getElectronConfig?.();
/**
 * Timeout added due to circular dependencies
 */
// setTimeout(() => {

  const electronConfig = getElectronConfig?.();
  if(electronConfig){
    PORT = electronConfig.port ?? 3099;
    
    const creds = electronConfig.getCredentials();
    if(creds){
      tryStartProstgles(creds);
    } else {
      console.log("Electron: No credentials");
    }
    setDBSRoutes(true);
    console.log("Starting electron on port: ", PORT);
  } else {
    tryStartProstgles();
    console.log("Starting non-electron on port: ", PORT);
  }
  
  http.listen(PORT);
// }, 10)





 

 
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

  // ...

  // Restart process ...
  spawn(process.argv[0], process.argv.slice(1), {
    env: { process_restarting: 1 },
    stdio: 'ignore'
  }).unref();
}

export const upsertConnection = async (con: DBSchemaGenerated["connections"]["columns"], user_id: Users["id"] | null, dbs: DBS) => {
  
  const c: Connections = validateConnection({ 
    ...con, 
    user_id,
    last_updated: Date.now()
  });
  await testDBConnection(con);
  try {
    let res;
    if(con.id){
      if(!(await dbs.connections.findOne({ id: con.id }))){
        throw "Connection not found: " + con.id
      }
      res = await dbs.connections.update({ id: con.id }, omitKeys(c, ["id"]) , { returning: "*" });
    } else {
      res = await dbs.connections.insert(c, { returning: "*" });
    }
    return res;
  } catch(e: any){
    console.error(e);
    if(e && e.code === "23502"){
      throw { err_msg: ` ${e.column} cannot be empty` }
    }
    throw e;
  }
}


export const tout = (timeout: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true)
    }, timeout)
  })
}