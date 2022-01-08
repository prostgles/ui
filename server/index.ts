import path from 'path';
import express from 'express';
import prostgles from "prostgles-server";
import { AnyObject } from "prostgles-types";
const app = express();
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

process.env.NODE_TLS_REJECT_UNAUTHORIZED='0'

// console.log("Connecting to state database" , process.env)

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});
 
const _http = require("http");
const http = _http.createServer(app);
const exec = require('child_process').exec; 

const ioPath = process.env.PRGL_IOPATH || "/iosckt";

import { Server }  from "socket.io";
const io = new Server(http, { path: ioPath, maxHttpBufferSize: 100e100 });
const pgp = require("pg-promise")();

// const dns = require('dns');
 
const testDBConnection = (opts: {
  type?: string; db_conn?: string; db_user: string; 
  db_pass: string; db_host: string; db_port: number; 
  db_name: string, db_ssl?: string 
}, isSuperUser = false) => {
  
  if(typeof opts !== "object" || !("db_host" in opts) && !("db_conn" in opts)) {
    throw "Incorrect database connection info provided. " + 
    "\nExpecting: \
      db_conn: string; \
      OR \
      db_user: string; db_pass: string; db_host: string; db_port: number; db_name: string, db_ssl: string";
  }
  const { type, db_conn, db_user, db_pass, db_host, db_port, db_name, db_ssl } = opts;
  
  // console.log(db_conn)

  return new Promise((resolve, reject) => {
    const connOpts = 
      (type === "Connection URI" || db_conn)? {
        connectionString: db_conn
      } : {
        database: db_name, 
        user: db_user, 
        password: db_pass, 
        host: db_host, 
        port: db_port,
        ssl: Boolean(db_ssl && db_ssl !== "disable")
      };
      
      const db = pgp(connOpts);
      db.connect()
        .then(async function (c) {
          // console.log(connOpts, "success, release connectio ", await db.any("SELECT current_database(), current_user, (select usesuper from pg_user where usename = CURRENT_USER)"))
          
          if(isSuperUser){
            const yes = await c.oneOrNone(`select usesuper from pg_user where usename = CURRENT_USER;`);
            if(!yes?.usesuper){
              reject("Provided user must be a superuser");
              return
            }
          }
          c.done(); // success, release connection;
          
          resolve(true);
        }).catch(err => {
          console.error("testDBConnection fail", {connOpts, err})
          reject(err)
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

const dotenv = require('dotenv')

const EMPTY_USERNAME = "prostgles-no-auth-user",
  EMPTY_PASSWORD = "prostgles";
let HAS_EMPTY_USERNAME = false;

const result = dotenv.config({ path: path.join(__dirname+'/../../.env') })
const {
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

http.listen(+process.env.PRGL_PORT || 3004);

import {  DBObj } from "./DBoGenerated";
// type DBObj = any;
type Files= any; type Projects= any; type Sessions= any; type Users= any; type Connections = any;
import { DB, DbHandler, PGP } from 'prostgles-server/dist/Prostgles';

const log = (msg: string, extra?: any) => {
  console.log(...[`(server): ${(new Date()).toISOString()} ` + msg, extra].filter(v => v));
}

app.use(express.static(path.join(__dirname, "../../client/build"), { index: false }));
app.use(express.static(path.join(__dirname, "../../client/static"), { index: false }));

const makeSession = async (user: Users, dbo: DBObj , expires: number) => {

  if(user){
    const session = await dbo.sessions.insert({ 
      user_id: user.id, 
      user_type: user.type, 
      expires, 
    }, { returning: "*" }) as any;
    
    return { sid: session.id, expires: +session.expires }; //60*60*60 }; 
  } else {
    throw "Invalid user";
  }
}
 
/* AUTH */ 
import cookieParser from 'cookie-parser';
import { Auth, BasicSession } from 'prostgles-server/dist/AuthHandler';

app.use(cookieParser());

let authCookieOpts = (process.env.PROSTGLES_STRICT_COOKIE || PROSTGLES_STRICT_COOKIE)? {} : {
  secure: false,
  sameSite: "lax"    //  "none"
};

const auth: Auth<DBObj> = {
	sidKeyName: "sid_token",
	getClientUser: async (sid: string, db: DBObj, _db: DB) => {
    log("getClientUser", sid)
    
		const s = await db.sessions.findOne({ id: sid });
		let result;
		if(s){
			const u = await db.users.findOne({ id: s.user_id });
			if(u) result = { sid: s.id, uid: u.id, type: u.type };
		}
		return result
	}, 
	getUser: async (sid: string, db, _db: DB) => {
    log("getUser", sid);
		const s = await db.sessions.findOne({ id: sid });
    let user;
		if(s) {
      /* Check if container_maintainer_token 
        CHECK FOR remote_addr IP TO ENSURE IT IS FROM COMPUTE ONLY ??????
      */
      user = await db.users.findOne({ id: s.user_id });
      if(s.project_id && (await db.connections.count({ user_id: s.user_id, id: s.project_id }))){
        user = { ...user, project_id: s.project_id }
      }
    }
    // console.trace("getUser", { user, s })
		return user;
	},
	login: async ({ username = null, password = null } = {}, db: DBObj, _db: DB) => {
		let u;
    log("login", username)
    /**
     * If no login config provided then login automatically
     */
    // if(!PRGL_USERNAME){
    //   username = EMPTY_USERNAME; 
    //   password = EMPTY_PASSWORD;
    // }
    try {
      u = await _db.one("SELECT * FROM users WHERE username = ${username} AND password = crypt(${password}, id::text) AND status = 'active';", { username, password });
    } catch(e){
      throw "User and password not matching anything";
    }
		if(!u) {
			// console.log( await db.users.find())
			throw "something went wrong: " + JSON.stringify({ username, password });
		}
		let s = await db.sessions.findOne({ user_id: u.id })
		if(!s){
			return makeSession(u, db, Date.now() + 1000 * 60 * 60 * 24)
     // would expire after 24 hours,
		}
    
		return { sid: s.id, expires: +s.expires }
	},
	logout: async (sid = null, db: DBObj, _db: DB) => {
		const s = await db.sessions.findOne({ id: sid });
		if(!s) throw "err";
		await db.sessions.delete({ id: sid })
		return true; 
	},
  cacheSession: {
    getSession: async (sid, db) => {
      let s = await db.sessions.findOne({ id: sid });
      if(s) return { sid: s.id, ...s } as BasicSession;
      return undefined;
    }
  },
  expressConfig: {
    app,
    // userRoutes: ["/", "/connection", "/connections", "/profile", "/jobs", "/chats", "/chat", "/account", "/dashboard", "/registrations"],
    publicRoutes: ["/manifest.json", "/favicon.ico"], // ["/"],
    onGetRequestOK: (req, res) => {
      console.log("onGetRequestOK", req.path);

      res.sendFile(path.join(__dirname + '/../../client/build/index.html'));
    },
    cookieOptions: authCookieOpts,
    magicLinks: {
      check: async (id, dbo, db) => {
        const mlink = await dbo.magic_links.findOne({ id });
        
        if(mlink){
          if(mlink.expires < Date.now()) throw "Expired magic link";
        }
        const user = await dbo.users.findOne({ id: mlink.user_id });
  
        return makeSession(user, dbo , mlink.expires);
      }
    }
  }
};

let prgl_connections: Record<string,
{ 
  io?: any; 
  prgl?: {
    db: DbHandler;
    _db: DB;
    pgp: PGP;
    io?: any;
    destroy: () => Promise<boolean>;
  }; 
  socket_path: string; 
  con: Connections; 
  error?: any 
}> = {};


let con, _io;

let login_throttle;
let child_pid;



const getDBS = async () => {
  try {

    const con = {
      db_conn: process.env.POSTGRES_URL || POSTGRES_URL, 
      db_name: process.env.POSTGRES_DB || POSTGRES_DB, 
      db_user: process.env.POSTGRES_USER || POSTGRES_USER, 
      db_pass: process.env.POSTGRES_PASSWORD || POSTGRES_PASSWORD, 
      db_host: process.env.POSTGRES_HOST || POSTGRES_HOST, 
      db_port: process.env.POSTGRES_PORT || POSTGRES_PORT, 
      db_ssl:  process.env.POSTGRES_SSL || POSTGRES_SSL,
    }
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
    await testDBConnection(con, true);

    prostgles({
      dbConnection: {
        host: con.db_host,
        port: +con.db_port || 5432,
        database: con.db_name,
        user: con.db_user,
        password:  con.db_pass,
      },
      sqlFilePath: path.join(__dirname+'/../init.sql'),
      io,
      tsGeneratedTypesDir: path.join(__dirname + '/../'),
      transactions: true,
      onSocketConnect: async (_, dbo: DBObj) => {
        log("onSocketConnect", (_ as any)?.conn?.remoteAddress);

        
        const wids = await dbo.windows.find({ $or: [{ deleted: true }, { closed: true }] }, { select: { id: 1 }, returnType: "values" });
        if(wids.length){
          await dbo.links.delete({ $or: [
            { w1_id: { $in: wids } }, 
            { w2_id: { $in: wids } },
            { deleted: true }
          ] })
          await dbo.windows.delete({ deleted: true });
  
        }
        return true; 
      },
      onSocketDisconnect: (_, dbo: DBObj) => {
        // dbo.windows.delete({ deleted: true })
      },
      // DEBUG_MODE: true,
      tableConfig: {
        
        magic_links: {
          // dropIfExistsCascade: true,
          columns: {
            id:                  { sqlDefinition: `TEXT PRIMARY KEY DEFAULT gen_random_uuid()` },
            user_id:             { sqlDefinition: `UUID REFERENCES users(id)` },
            magic_link:          { sqlDefinition: `TEXT` },
            magic_link_used:     { sqlDefinition: `TIMESTAMP` },
            expires:             { sqlDefinition: `BIGINT NOT NULL` },
          }
        },
      },
      publishRawSQL: async (params) => {
        const { user } = params
        return Boolean(user && user.type === "admin")
      },
      auth,
      publishMethods: async (params) => { //  socket, db: DBObj, _db, user: Users
        const { user, dbo: db, socket } = params
        if(!user || !user.id) {

          const makeMagicLink = async (user: Users, dbo: DBObj, returnURL: string) => {
            const mlink = await dbo.magic_links.insert({ 
              expires: Number.MAX_SAFE_INTEGER, // Date.now() + 24 * 3600 * 1000, 
              user_id: user.id,
          
            }, {returning: "*"});
                    
            return {
              id: user.id,
              magic_login_link_redirect: `/magic-link/${mlink.id}?returnURL=${returnURL}`
            };
          }
          /** If no user exists then make */
          if(HAS_EMPTY_USERNAME){
            const u = await db.users.findOne({ username: EMPTY_USERNAME });
            const mlink = await makeMagicLink(u, db, "/")
            socket.emit("redirect", mlink.magic_login_link_redirect);
          }


          return null;
        }
        
        return {
          testDBConnection: async (opts) => testDBConnection(opts),
          createConnection: async (con) => {
            const row = { 
                ...con, 
                user_id: user.id,
              }
            delete row.type;
            // console.log("createConnection", row)
            try {
              await testDBConnection(con);
              let res;
              if(con.id){
                delete row.id;
                res = await db.connections.update({ id: con.id }, row, { returning: "*" });
              } else {
                res = await db.connections.insert(row, { returning: "*" });
              }
              return res;
            } catch(e){
              console.error(e);
              if(e && e.code === "23502"){
                throw { err_msg: ` ${e.column} cannot be empty` }
              } else if(e && e.code === "23505"){
                throw { err_msg: `Connection ${JSON.stringify(con.name)} already exists` }
              }
              throw e;
            }
          },
          deleteConnection: async (id) => {
            return db.connections.delete({ id, user_id: user.id }, { returning: "*" });
          },
          startConnection: async (con_id) => {

            const con = await db.connections.findOne({ id: con_id });
            if(!con) throw "Connection not found";

            // @ts-ignore
            await testDBConnection(con)

            const socket_path = `/prj/${con_id}-dashboard/s`;

            try {
              if(prgl_connections[con.id]){
                if(prgl_connections[con.id].socket_path !== socket_path ){

                  restartProc(() => {
                    socket?.emit("pls-restart", true)
                  })
                  
                  if(prgl_connections[con.id].prgl){
                    console.log("destroying prgl", Object.keys(prgl_connections[con.id]));
                    prgl_connections[con.id].prgl.destroy()
                  }
                } else {
                  console.log("reusing prgl", Object.keys( prgl_connections[con.id]));
                  if(prgl_connections[con.id].error) throw  prgl_connections[con.id].error;
                  return socket_path;
                }
              }
              console.log("creating prgl", Object.keys( prgl_connections[con.id] || {}))
              prgl_connections[con.id] = {
                socket_path, con
              }

            } catch(e) {
              console.error(e);
              throw e;
            }

            return new Promise(async (resolve, reject) => {
              
              /**
               * Separate process
               */
              // if(child_pid) {
              //   console.log("Killing process: ", child_pid)
              //   process.kill(child_pid);
              // }

              // let proc = exec('node ./proj-prgl.js ', {
              //   env: {
              //     app_port: 3002,
              //     ...con,
              //     socket_path
              //   }
              // });
              // logProcess(proc)
              // child_pid = proc.pid
              // console.log(`Launched child process: PID: ${child_pid}`, {socket_path, ...con,});
              // resolve(socket_path);
              // return ;
 

              const _io = new Server(http, { path: socket_path, maxHttpBufferSize: 1e8 });

              try {
                
                const prgl = await prostgles({
                  dbConnection: con.db_conn? 
                    { connectionString: con.db_conn } :
                    {
                      host: con.db_host,
                      port: con.db_port,
                      database: con.db_name,
                      user: con.db_user,
                      password:  con.db_pass,
                    },
                  io: _io,
                  // onSocketConnect: (socket) => {
                  //   log("onSocketConnect");
                    
                  //   return true; 
                  // }, 
                  // tsGeneratedTypesDir: path.join(__dirname + '/../connection_dbo/'),

                  watchSchema: Boolean(con.db_watch_shema), 
                  // watchSchema: "hotReloadMode", 

                  // transactions: true,
                  // DEBUG_MODE: true,
                  // fileTable: { 
                  //   tableName:"filetable",
                  //   expressApp: app,
                  //   localConfig: {
                  //     localFolderPath: path.join(__dirname + `../${con.id}/media`)
                  //   },
                  // },
                  joins: "inferred",
                  // joins: [

                  // ],
                  publish: "*",
                  
                  publishRawSQL: () => "*",
                  // publishMethods: (params) => {

                  //   return {
                  //     sendObj: async (obj) => {
                  //       console.log(obj);
                  //       const { rows, statements } = obj;
                  //       for (let i = 0; i < rows.length; i++){
                  //         try {
                  //           await params.db.any(statements[i], rows[i]);
                  //           // console.log(rows[i])
                  //         } catch(e){
                  //           console.error(e);
                  //         }
                  //       }
                  //     }
                  //   }

                  // },
                  onReady: async (db, _db) => {
                    console.log("onReady connection", Object.keys(db));

                    // const term = "e1"
                    // const filter = { $term_highlight: ["*", term, { matchCase: false, edgeTruncate: 30, returnType: "boolean" } ] }
                    // const s = { $term_highlight: ["*", term, { matchCase: false, edgeTruncate: 30, returnType: "object" } ] }

                    // try {
                    //   const rows = await db.codepointopen_london_201709.find(filter, { select: { s } }, { returnQuery: true })
                    //   console.log(rows)
                    // } catch(e){
                    //   console.error(e)
                    // }

                    // _db.any("SELECT current_database()").then(console.log)
                    resolve(socket_path);
                    console.log("dbProj ready", con.db_name)
                  }
                });
                prgl_connections[con.id] = {
                  prgl, 
                  io,
                  socket_path,
                  con,
                }

              } catch(e) {
                reject(e)
                prgl_connections[con.id] = {
                  error: e, 
                  io,
                  socket_path,
                  con,
                }
              }

            })


            // prgl_connection = {
            //   prgl: {}, 
            //   io: _io,
            //   socket_path,
            //   con,
            // }

            return socket_path
            
          }
        }
      },
      publish: async (params) => {
        
        const { dbo: db, user, db: _db } = params;

        if(!user || !user.id){
          return null;
        }
        const { id: user_id } = user;
        // _db.any("ALTER TABLE workspaces ADD COLUMN options         JSON DEFAULT '{}'::json")

        /** Add state db */
        if(!(await db.connections.count({ user_id }))){ // , name: "Prostgles state database"
          await db.connections.insert({  
            ...con, 
            user_id, 
            name: "Prostgles state database", 
            type: !con.db_conn? 'Standard' : 'Connection URI',
            db_port: con.db_port || 5432,
            db_ssl: con.db_ssl || "disable"
          })
        }

        const dashboardConfig = ["windows", "links", "workspaces"]
          .reduce((a: any, v: string) => ({ 
            ...a, 
            [v]: {
              select: {
                fields: "*",
                forcedFilter: { user_id  }
              },
              sync: {
                id_fields: ["id"],
                synced_field: "last_updated",
                allow_delete: true
              },

              update: {
                fields: "*",
                forcedData: { user_id },
                forcedFilter: { user_id },
              }, 
              insert: {
                fields: "*",
                forcedData: { user_id }
              },
              delete: {
                filterFields: "*",
                forcedFilter: { user_id }
              }
          },
        }) ,{});

        let res = {

          /* DASHBOARD */
          ...dashboardConfig,

          users: {
            select: {
              fields: "*",
              forcedFilter: { id: user_id }
            }
          },
        }

        const curTables = Object.keys(res);
        const remainingTables = Object.keys(db).filter(k => db[k].find).filter(t => !curTables.includes(t));
        const adminExtra = remainingTables.reduce((a, v) => ({ ...a, [v]: "*" }), {});
        res = {
          ...res,
          ...adminExtra
        }
        return res;
      },
      joins: "inferred",
      onReady: async (db: DBObj, _db: DB) => {
        
        let username = PRGL_USERNAME,
          password = PRGL_PASSWORD;
        if(
          !PRGL_USERNAME || !PRGL_PASSWORD
        ){
          HAS_EMPTY_USERNAME = true;
          username = EMPTY_USERNAME;
          password = EMPTY_PASSWORD;
        }

        // await db.users.delete(); 
        if(!(await db.users.count({ username }))){
          if(HAS_EMPTY_USERNAME){
            console.warn(`PRGL_USERNAME or PRGL_PASSWORD missing. Creating default user: ${username} with default password: ${password}`);
          }
          console.log((await db.users.count({ username })))
          try {
            await db.users.insert({ username, password }, { returning: "*" }) as Users;
            await _db.any("UPDATE users SET password = crypt(password, id::text), status = 'active' WHERE status IS NULL;");

          } catch(e){
            console.error(e)
          }
          
          console.log("Added users: ", await db.users.find({ username }))
        }

      },  
    });
  } catch(err){
    throw err;
  }
}


(async () => {
  let error, tries = 0
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
      console.log("app.get")
      app.get("/dbs", (req, res) => {    
        if(error){
          res.json({ err: error })
        } else {
          res.json({ ok: true })
        }
      })
    
      if(error) app.get("*", (req, res) => {
        console.log(req.originalUrl ,req)
        res.sendFile(path.join(__dirname + '/../../client/build/index.html'));
      })
      return
    }

  }, 2000);
  

  // app.get("/dbs", (req, res) => {    
  //   if(error){
  //     res.json({ err: error })
  //   } else {
  //     res.json({ ok: true })
  //   }
  // })

  // if(error) app.get("*", (req, res) => {
  //   console.log(req.originalUrl ,req)
  //   res.sendFile(path.join(__dirname + '/../../client/build/index.html'));
  // })
})()

app.post("/dbs", async (req, res) => {
  const { db_conn, db_user, db_pass, db_host, db_port, db_name, db_ssl } = req.body;
  if(!db_conn || !db_host){
    res.json({ ok: false })
  }

  try {
    await testDBConnection({ db_conn, db_user, db_pass, db_host, db_port, db_name, db_ssl });

    res.json({ msg: "DBS changed. Restart system" })
  } catch(err){
    res.json({ err })
  }
})


 

 
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


function logProcess(proc){

  const p = `PID ${proc.pid}`;
  proc.stdout.on('data', function (data) {
    console.log(p + ' stdout: ' + data);
  });
  
  proc.stderr.on('data', function (data) {
    console.log(p + ' stderr: ' + data);
  });
  
  proc.on('close', function (code) {
    console.log(p + ' child process exited with code ' + code);
  });
}

const spawn = require('child_process').spawn;
function restartProc(cb?: Function){
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