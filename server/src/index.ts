import path from 'path';
import express from 'express';
import prostgles from "prostgles-server";
import { tableConfig } from "./tableConfig";
const app = express();
import { publishMethods } from "./publishMethods";
import { ChildProcessWithoutNullStreams } from "child_process";
import { ConnectionManager, Unpromise } from "./ConnectionManager";
import { getAuth } from "./authConfig";


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

export const ROOT_DIR = path.join(__dirname, "/../../.." ); 

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

console.log(ROOT_DIR)
const result = dotenv.config({ path: path.join(ROOT_DIR+'/../.env') })
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

const PORT = +(process.env.PRGL_PORT ?? 3004)
http.listen(PORT);

// type DBObj = any;
export type Users = Required<DBSchemaGenerated["users"]["columns"]>; 
export type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
import { DB, isSuperUser, PGP } from 'prostgles-server/dist/Prostgles';

export const log = (msg: string, extra?: any) => {
  console.log(...[`(server): ${(new Date()).toISOString()} ` + msg, extra].filter(v => v));
}

app.use(express.static(path.join(ROOT_DIR, "../client/build"), { index: false }));
app.use(express.static(path.join(ROOT_DIR, "../client/static"), { index: false }));

 
/* AUTH */ 
import cookieParser from 'cookie-parser';
import { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";

app.use(cookieParser());

export const MEDIA_ROUTE_PREFIX = `/prostgles_media`
 


const DBS_CONNECTION_INFO: Pick<Required<Connections>, "type" | "db_conn" | "db_name" | "db_user" | "db_pass" | "db_host" | "db_port" | "db_ssl"> = {
  type: !(process.env.POSTGRES_URL || POSTGRES_URL)? "Standard" : "Connection URI",
  db_conn: process.env.POSTGRES_URL || POSTGRES_URL, 
  db_name: process.env.POSTGRES_DB || POSTGRES_DB, 
  db_user: process.env.POSTGRES_USER || POSTGRES_USER, 
  db_pass: process.env.POSTGRES_PASSWORD || POSTGRES_PASSWORD, 
  db_host: process.env.POSTGRES_HOST || POSTGRES_HOST, 
  db_port: process.env.POSTGRES_PORT || POSTGRES_PORT, 
  db_ssl:  process.env.POSTGRES_SSL || POSTGRES_SSL,
};

import { omitKeys } from "prostgles-server/dist/PubSubManager";


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

const getDBS = async () => {
  try {

    const con = DBS_CONNECTION_INFO;
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
    prostgles<DBSchemaGenerated>({
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
      onSocketConnect: async ({ socket, dbo, db }) => {
        const remoteAddress = (socket as any)?.conn?.remoteAddress;
        log("onSocketConnect", remoteAddress);

        console.error("CHECK CORS");
        // if(await checkIfNoPWD(dbo) && remoteAddress.includes("127.0.0.1")) { //  === "::ffff:127.0.0.1"
        //   const errMsg = "Reject foreign requests if there is no auth";
        //   throw errMsg;
        // }

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

        await connectionChecker.init(db, _db);

        await connMgr.init(db);
        bkpManager ??= new BackupManager(db);


        console.log("Prostgles UI is running on port ", PORT)
      },  
    });
  } catch(err){
    throw err;
  }
}


(async () => {
  let error: any, tries = 0
  let interval = setInterval(async () => {
    
    try {
      await getDBS();
      tries = 6;
      error = null;
      // clearInterval(interval)
    } catch(err){
      console.log("getDBS", err)
      error = err;
      tries++;
    }

    if(tries > 5){
      clearInterval(interval);
      
      app.get("/dbs", (req, res) => {    
        if(error){
          res.json({ err: error })
        } else {
          res.json({ ok: true })
        }
      })
    
      if(error) {
        app.get("*", (req, res) => {
          console.log(req.originalUrl)
          res.sendFile(path.join(ROOT_DIR + '../client/build/index.html'));
        })
      }
      return
    }

  }, 2000);
  
})();


// app.post("/dbs", async (req, res) => {
//   const { db_conn, db_user, db_pass, db_host, db_port, db_name, db_ssl } = req.body;
//   if(!db_conn || !db_host){
//     res.json({ ok: false })
//   }

//   try {
//     await testDBConnection({ db_conn, db_user, db_pass, db_host, db_port, db_name, db_ssl } as any);

//     res.json({ msg: "DBS changed. Restart system" })
//   } catch(err){
//     res.json({ err })
//   }
// });


 

 
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

export const upsertConnection = async (con: DBSchemaGenerated["connections"]["columns"], user: Users, dbs: DBS) => {
  if(user?.type !== "admin" || !user.id){
    throw "User missing or not admin"
  }
  const c: Connections = validateConnection({ 
    ...con, 
    user_id: user.id,
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