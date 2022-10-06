import path from 'path';
import express from 'express';
import prostgles from "prostgles-server";
import { tableConfig } from "./tableConfig";
const app = express();
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
import { publishMethods } from "./publishMethods";
import { ChildProcessWithoutNullStreams } from "child_process";
import { ConnectionManager } from "./ConnectionManager";
import { getAuth } from "./authConfig";

export const API_PATH = "/api";

/** Required to enable API access */
import cors from 'cors';
app.use(cors({ origin: '*' }));

// use it before all route definitions

import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
// console.log("Connecting to state database" , process.env)

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});
import { SubscriptionHandler } from "prostgles-types";

export const ROOT_DIR = path.join(__dirname, "/../../.." ); 

import _http from "http";
const http = _http.createServer(app);

const ioPath = process.env.PRGL_IOPATH || "/iosckt";

import { Server }  from "socket.io";
const io = new Server(http, { 
  path: ioPath, 
  maxHttpBufferSize: 100e100,  
});

import pgPromise from 'pg-promise';
const pgp = pgPromise();
import { ConnectionString } from 'connection-string';

import { publish } from "./publish"
// const dns = require('dns');

export const validateConnection = (c: DBSchemaGenerated["connections"]["columns"]): Connections => {
  let result: Connections = { ...c } as any;
  
  if(c.type === "Connection URI"){
    if(!c.db_conn){
      result.db_conn = validateConnection({ ...result, type: "Standard" }).db_conn
    }
    const cs = new ConnectionString(result.db_conn);
    const params = cs.params ?? {};
    const { 
      sslmode,
      host,
      port,
      dbname,
      user,
      password,
    } = params;

    // if(!cs.hosts?.length) throw `Host missing`
    // if(!cs.path?.length) throw `DB name missing`

    result.db_host = cs.hosts?.[0].name ?? host;
    result.db_port = cs.hosts?.[0].port ?? +port;
    result.db_user = cs.user ?? user;
    result.db_pass = cs.password ?? password;
    result.db_name = cs.path?.[0] ?? dbname;
    result.db_ssl = sslmode;
    // result.type = "Standard"
  } else if(c.type === "Standard" || c.db_host){
    const cs = new ConnectionString(null, { protocol: "postgres" });
    cs.hosts = [{ name: c.db_host!, port: c.db_port! }];
    cs.password = c.db_pass!;
    cs.user = c.db_user!;
    cs.path = [c.db_name!];
    cs.params = c.db_ssl? { sslmode: c.db_ssl ?? "prefer" } : undefined;
    result.db_conn = cs.toString()
  } else throw "Not supported"

  result.db_user = result.db_user || "postgres";
  result.db_host = result.db_host || "localhost";
  result.db_ssl = result.db_ssl || "disable";
  result.db_port = result.db_port ?? 5432;


  return result;
}
export const getConnectionDetails = (c: Connections): pg.IConnectionParameters<pg.IClient> => {
  /**
   * Cannot use connection uri without having ssl issues
   * https://github.com/brianc/node-postgres/issues/2281
   */
  const getSSLOpts = (sslmode: Connections["db_ssl"]): pg.IConnectionParameters<pg.IClient>["ssl"] => sslmode && sslmode !== "disable"? ({
    ca: c.ssl_certificate ?? undefined,
    cert: c.ssl_client_certificate ?? undefined,
    key: c.ssl_client_certificate_key ?? undefined,
    rejectUnauthorized: c.ssl_reject_unauthorized ?? (sslmode === "require" && !!c.ssl_certificate || sslmode === "verify-ca" || sslmode === "verify-full")
  }) : undefined;

  if(c.type === "Connection URI"){
    const cs = new ConnectionString(c.db_conn);
    const params = cs.params ?? {};
    const { sslmode, application_name = "prostgles" } = params;
    return {
      // connectionString: c.db_conn,
      application_name,
      host: cs.hosts![0].name,
      port: cs.hosts![0].port,
      user: cs.user,
      password: cs.password,
      database: cs.path![0],
      ssl: getSSLOpts(sslmode),
    }
  }
  return {
    database: c.db_name!, 
    user: c.db_user!, 
    password: c.db_pass!, 
    host: c.db_host!,
    port: c.db_port!,
    ssl: getSSLOpts(c.db_ssl)
  };
}
export type BareConnectionDetails = Pick<Connections, "type" | "db_conn" | "db_host" | "db_name" | "db_pass" | "db_port" | "db_user" | "db_ssl" | "ssl_certificate">

export const testDBConnection = (_c: DBSchemaGenerated["connections"]["columns"], expectSuperUser = false): Promise<true> => {
  const con = validateConnection(_c);
  if(typeof con !== "object" || !("db_host" in con) && !("db_conn" in con)) {
    throw "Incorrect database connection info provided. " + 
    "\nExpecting: \
      db_conn: string; \
      OR \
      db_user: string; db_pass: string; db_host: string; db_port: number; db_name: string, db_ssl: string";
  }
  
  // console.log(db_conn)

  return new Promise(async (resolve, reject) => {
    let connOpts = getConnectionDetails(con);
      const db = pgp({ ...connOpts, connectionTimeoutMillis: 1000 });
      db.connect()
        .then(async function (c: pgPromise.IConnected<{}, pg.IClient>) {
          // console.log(connOpts, "success, release connectio ", await db.any("SELECT current_database(), current_user, (select usesuper from pg_user where usename = CURRENT_USER)"))
          
          if(expectSuperUser){
            const usessuper = await isSuperUser(c as any);
            if(!usessuper){
              reject("Provided user must be a superuser");
              return
            }
          }
          await c.done(); // success, release connection;
          
          resolve(true);
        }).catch(err => {
          let errRes = err instanceof Error? err.message : JSON.stringify(err);
          if(process.env.IS_DOCKER){

            if(con.db_host === "localhost" || con.db_host === "127.0.0.1"){
              errRes += `\nHint: to connect to a localhost database from docker you need to:\n `+
`1) Uncomment extra_hosts in docker-compose.yml:  
    extra_hosts:
      - "host.docker.internal:host-gateway"
 2) postgresql.conf contains:
    listen_addresses = '*'
 3) pg_hba.conf contains:
    host  all   all   0.0.0.0/0 md5
 4) Ensure the user you connect with has an encrypted password. 
 5) use "host.docker.internal" instead of "localhost" in the above connection details
`
            }
          }
          // console.error("testDBConnection fail", {err, connOpts, con})
          reject(errRes)
        });
    /**
     * Used to prevent connecting to localhost or internal networks
     */
    // dns.lookup(host, function(err, result) {
    //   if(err) return reject(err);
    //   else if(["127.0.0.1"].includes(result)){
    //     return reject("localhost not allowed");
    //   } else {
    //     resolve(pgp({ user: username, password, host, port, databse, ssl }).connect());
    //   }
    // });
  })
}

const dotenv = require('dotenv');
export type DBS = DBOFullyTyped<DBSchemaGenerated>

export const EMPTY_USERNAME = "prostgles-no-auth-user",
  EMPTY_PASSWORD = "prostgles";
export const HAS_EMPTY_USERNAME = async (db: DBS) => {
  if(
    !PRGL_USERNAME || !PRGL_PASSWORD
  ){
    if(await db.users.count({ username: EMPTY_USERNAME, status: "active" })){
      return true
    }
  }
  return false
};

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
import pg from "pg-promise/typescript/pg-subset";

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
export const connMgr = new ConnectionManager(http, app);

let conSub: SubscriptionHandler<Connections> | undefined;

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
      onSocketConnect: async (_, dbo, db) => {
        log("onSocketConnect", (_ as any)?.conn?.remoteAddress);

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
        return true; 
      },
      onSocketDisconnect: (_, dbo) => {
        // dbo.windows.delete({ deleted: true })
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

        
        // const q = await db.connections.find({}, { 
        //   orderBy: [{ db_conn: 1 }, { created: -1 }], 
        //   select: { 
        //     "*": 1, 
        //     crtd: { "$datetime": ["created"] },
        //     access_control_user_types: { ids: { "$countAll": [] } }
        //   },  
        //   returnType: "statement"
        // });
        
        // console.log(q)

        await conSub?.unsubscribe();
        conSub = await db.connections.subscribe({}, {}, connections => {
          connMgr.saveCertificates(connections)
        });

        let username = PRGL_USERNAME,
          password = PRGL_PASSWORD;
        if(
          !PRGL_USERNAME || !PRGL_PASSWORD
        ){
          username = EMPTY_USERNAME;
          password = EMPTY_PASSWORD;
        }

        // await db.users.delete(); 
        
        if(!(await db.users.count({ username }))){
          if(await HAS_EMPTY_USERNAME(db)){
            console.warn(`PRGL_USERNAME or PRGL_PASSWORD missing. Creating default user: ${username} with default password: ${password}`);
          }
          console.log((await db.users.count({ username })))
          try {
            const u = await db.users.insert({ username, password, type: "admin" }, { returning: "*" }) as Users;
            await _db.any("UPDATE users SET password = crypt(password, id::text), status = 'active' WHERE status IS NULL AND id = ${id};", u);

          } catch(e){
            console.error(e)
          }
          
          console.log("Added users: ", await db.users.find({ username }))
        }

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


app.post("/testupload", (req, res) => {
  console.log(req.body)
})

app.post("/dbs", async (req, res) => {
  const { db_conn, db_user, db_pass, db_host, db_port, db_name, db_ssl } = req.body;
  if(!db_conn || !db_host){
    res.json({ ok: false })
  }

  try {
    await testDBConnection({ db_conn, db_user, db_pass, db_host, db_port, db_name, db_ssl } as any);

    res.json({ msg: "DBS changed. Restart system" })
  } catch(err){
    res.json({ err })
  }
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