"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.get = void 0;
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const prostgles_server_1 = __importDefault(require("prostgles-server"));
const tableConfig_1 = require("./tableConfig");
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: "100mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "100mb" }));
// process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
// console.log("Connecting to state database" , process.env)
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});
const _http = require("http");
const http = _http.createServer(app);
const exec = require('child_process').exec;
const ioPath = process.env.PRGL_IOPATH || "/iosckt";
const socket_io_1 = require("socket.io");
const io = new socket_io_1.Server(http, { path: ioPath, maxHttpBufferSize: 100e100 });
const pg_promise_1 = __importDefault(require("pg-promise"));
const pgp = (0, pg_promise_1.default)();
const publish_1 = require("./publish");
// const dns = require('dns');
const getConnectionDetails = (c) => {
    return (c.type === "Connection URI") ? {
        connectionString: c.db_conn
    } : {
        database: c.db_name,
        user: c.db_user,
        password: c.db_pass,
        host: c.db_host,
        port: c.db_port,
        ssl: !(c.db_ssl && c.db_ssl !== "disable") ? undefined : {
            rejectUnauthorized: false
        },
    };
};
const testDBConnection = (opts, isSuperUser = false) => {
    if (typeof opts !== "object" || !("db_host" in opts) && !("db_conn" in opts)) {
        throw "Incorrect database connection info provided. " +
            "\nExpecting: \
      db_conn: string; \
      OR \
      db_user: string; db_pass: string; db_host: string; db_port: number; db_name: string, db_ssl: string";
    }
    // console.log(db_conn)
    return new Promise((resolve, reject) => {
        const connOpts = getConnectionDetails(opts);
        const db = pgp(connOpts);
        db.connect()
            .then(async function (c) {
            // console.log(connOpts, "success, release connectio ", await db.any("SELECT current_database(), current_user, (select usesuper from pg_user where usename = CURRENT_USER)"))
            if (isSuperUser) {
                const yes = await c.oneOrNone(`select usesuper from pg_user where usename = CURRENT_USER;`);
                if (!(yes === null || yes === void 0 ? void 0 : yes.usesuper)) {
                    reject("Provided user must be a superuser");
                    return;
                }
            }
            c.done(); // success, release connection;
            resolve(true);
        }).catch(err => {
            console.error("testDBConnection fail", { connOpts, err });
            reject(err);
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
    });
};
const dotenv = require('dotenv');
const EMPTY_USERNAME = "prostgles-no-auth-user", EMPTY_PASSWORD = "prostgles";
const HAS_EMPTY_USERNAME = async (db) => {
    if (!PRGL_USERNAME || !PRGL_PASSWORD) {
        if (await db.users.count({ username: EMPTY_USERNAME, status: "active" })) {
            return true;
        }
    }
    return false;
};
const result = dotenv.config({ path: path_1.default.join(__dirname + '/../../.env') });
const { PRGL_USERNAME, PRGL_PASSWORD, POSTGRES_URL, POSTGRES_DB, POSTGRES_HOST, POSTGRES_PASSWORD, POSTGRES_PORT, POSTGRES_USER, POSTGRES_SSL, PROSTGLES_STRICT_COOKIE, } = (result === null || result === void 0 ? void 0 : result.parsed) || {};
const PORT = (_a = +process.env.PRGL_PORT) !== null && _a !== void 0 ? _a : 3004;
http.listen(PORT);
const log = (msg, extra) => {
    console.log(...[`(server): ${(new Date()).toISOString()} ` + msg, extra].filter(v => v));
};
app.use(express_1.default.static(path_1.default.join(__dirname, "../../client/build"), { index: false }));
app.use(express_1.default.static(path_1.default.join(__dirname, "../../client/static"), { index: false }));
const makeSession = async (user, dbo, expires) => {
    if (user) {
        const session = await dbo.sessions.insert({
            user_id: user.id,
            user_type: user.type,
            expires,
        }, { returning: "*" });
        return { sid: session.id, expires: +session.expires }; //60*60*60 }; 
    }
    else {
        throw "Invalid user";
    }
};
/* AUTH */
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const DboBuilder_1 = require("prostgles-server/dist/DboBuilder");
app.use((0, cookie_parser_1.default)());
let authCookieOpts = (process.env.PROSTGLES_STRICT_COOKIE || PROSTGLES_STRICT_COOKIE) ? {} : {
    secure: false,
    sameSite: "lax" //  "none"
};
const auth = {
    sidKeyName: "sid_token",
    getUser: async (sid, db, _db) => {
        log("getUser", sid);
        const s = await db.sessions.findOne({ id: sid });
        let user;
        if (s) {
            user = await db.users.findOne({ id: s.user_id });
            if (user) {
                const state_db = await db.connections.findOne({ is_state_db: true });
                return {
                    user,
                    clientUser: { sid: s.id, uid: user.id, type: user.type, state_db_id: state_db === null || state_db === void 0 ? void 0 : state_db.id }
                };
            }
            // if(s.project_id && (await db.connections.count({ user_id: s.user_id, id: s.project_id }))){
            //   user = { ...user, project_id: s.project_id }
            // }
        }
        // console.trace("getUser", { user, s })
        return undefined;
    },
    login: async ({ username = null, password = null } = {}, db, _db) => {
        let u;
        log("login", username);
        /**
         * If no login config provided then login automatically
         */
        // if(!PRGL_USERNAME){
        //   username = EMPTY_USERNAME; 
        //   password = EMPTY_PASSWORD;
        // }
        try {
            u = await _db.one("SELECT * FROM users WHERE username = ${username} AND password = crypt(${password}, id::text) AND status = 'active';", { username, password });
        }
        catch (e) {
            throw "User and password not matching anything";
        }
        if (!u) {
            // console.log( await db.users.find())
            throw "something went wrong: " + JSON.stringify({ username, password });
        }
        let s = await db.sessions.findOne({ user_id: u.id });
        if (!s || (+s.expires || 0) < Date.now()) {
            return makeSession(u, db, Date.now() + 1000 * 60 * 60 * 24);
            // would expire after 24 hours,
        }
        return { sid: s.id, expires: +s.expires };
    },
    logout: async (sid = null, db, _db) => {
        const s = await db.sessions.findOne({ id: sid });
        if (!s)
            throw "err";
        await db.sessions.delete({ id: sid });
        return true;
    },
    cacheSession: {
        getSession: async (sid, db) => {
            let s = await db.sessions.findOne({ id: sid });
            if (s)
                return Object.assign({ sid: s.id }, s);
            return undefined;
        }
    },
    expressConfig: {
        app,
        // userRoutes: ["/", "/connection", "/connections", "/profile", "/jobs", "/chats", "/chat", "/account", "/dashboard", "/registrations"],
        publicRoutes: ["/manifest.json", "/favicon.ico"],
        onGetRequestOK: (req, res) => {
            console.log("onGetRequestOK", req.path);
            res.sendFile(path_1.default.join(__dirname + '/../../client/build/index.html'));
        },
        cookieOptions: authCookieOpts,
        magicLinks: {
            check: async (id, dbo, db) => {
                const mlink = await dbo.magic_links.findOne({ id });
                if (mlink) {
                    if (mlink.expires < Date.now())
                        throw "Expired magic link";
                }
                const user = await dbo.users.findOne({ id: mlink.user_id });
                return makeSession(user, dbo, mlink.expires);
            }
        }
    }
};
let prgl_connections = {};
let con, _io;
let login_throttle;
let child_pid;
const DBS_CONNECTION_INFO = {
    db_conn: process.env.POSTGRES_URL || POSTGRES_URL,
    db_name: process.env.POSTGRES_DB || POSTGRES_DB,
    db_user: process.env.POSTGRES_USER || POSTGRES_USER,
    db_pass: process.env.POSTGRES_PASSWORD || POSTGRES_PASSWORD,
    db_host: process.env.POSTGRES_HOST || POSTGRES_HOST,
    db_port: process.env.POSTGRES_PORT || POSTGRES_PORT,
    db_ssl: process.env.POSTGRES_SSL || POSTGRES_SSL,
};
const getDBS = async () => {
    try {
        const con = DBS_CONNECTION_INFO;
        // console.log("Connecting to state database" , con, { POSTGRES_DB, POSTGRES_USER, POSTGRES_HOST }, process.env)
        if (!con.db_conn && !con.db_user && !con.db_name) {
            console.trace(con);
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
        (0, prostgles_server_1.default)({
            dbConnection: {
                host: con.db_host,
                port: +con.db_port || 5432,
                database: con.db_name,
                user: con.db_user,
                password: con.db_pass,
            },
            sqlFilePath: path_1.default.join(__dirname + '/../init.sql'),
            io,
            tsGeneratedTypesDir: path_1.default.join(__dirname + '/../'),
            transactions: true,
            onSocketConnect: async (_, dbo, db) => {
                var _a;
                log("onSocketConnect", (_a = _ === null || _ === void 0 ? void 0 : _.conn) === null || _a === void 0 ? void 0 : _a.remoteAddress);
                // await db.any("ALTER TABLE workspaces ADD COLUMN deleted boolean DEFAULT FALSE")
                const wrkids = await dbo.workspaces.find({ deleted: true }, { select: { id: 1 }, returnType: "values" });
                const wkspsFilter = wrkids.length ? { workspace_id: { $in: wrkids } } : {};
                const wids = await dbo.windows.find({ $or: [
                        { deleted: true },
                        { closed: true },
                        wkspsFilter
                    ] }, { select: { id: 1 }, returnType: "values" });
                if (wids.length) {
                    await dbo.links.delete({ $or: [
                            { w1_id: { $in: wids } },
                            { w2_id: { $in: wids } },
                            { deleted: true }
                        ] });
                    await dbo.windows.delete({ $or: [{ deleted: true }, wkspsFilter] });
                    await dbo.workspaces.delete({ deleted: true });
                }
                return true;
            },
            onSocketDisconnect: (_, dbo) => {
                // dbo.windows.delete({ deleted: true })
            },
            // DEBUG_MODE: true,
            tableConfig: tableConfig_1.tableConfig,
            publishRawSQL: async (params) => {
                const { user } = params;
                return Boolean(user && user.type === "admin");
            },
            auth,
            publishMethods: async (params) => {
                const { user, dbo: db, socket, db: _db } = params;
                // await _db.any("ALTER TABLE workspaces DROP CONSTRAINT workspaces_connection_id_name_key");
                // await _db.any("ALTER TABLE workspaces ADD CONSTRAINT constraintname UNIQUE (connection_id, user_id, name);");
                if (!user || !user.id) {
                    const makeMagicLink = async (user, dbo, returnURL) => {
                        const mlink = await dbo.magic_links.insert({
                            expires: Number.MAX_SAFE_INTEGER,
                            user_id: user.id,
                        }, { returning: "*" });
                        return {
                            id: user.id,
                            magic_login_link_redirect: `/magic-link/${mlink.id}?returnURL=${returnURL}`
                        };
                    };
                    /** If no user exists then make */
                    if (await HAS_EMPTY_USERNAME(db)) {
                        const u = await db.users.findOne({ username: EMPTY_USERNAME });
                        const mlink = await makeMagicLink(u, db, "/");
                        socket.emit("redirect", mlink.magic_login_link_redirect);
                    }
                    return null;
                }
                return {
                    testDBConnection: async (opts) => testDBConnection(opts),
                    createConnection: async (con) => {
                        const row = Object.assign(Object.assign({}, con), { user_id: user.id });
                        delete row.type;
                        // console.log("createConnection", row)
                        try {
                            await testDBConnection(con);
                            let res;
                            if (con.id) {
                                delete row.id;
                                res = await db.connections.update({ id: con.id }, row, { returning: "*" });
                            }
                            else {
                                res = await db.connections.insert(row, { returning: "*" });
                            }
                            return res;
                        }
                        catch (e) {
                            console.error(e);
                            if (e && e.code === "23502") {
                                throw { err_msg: ` ${e.column} cannot be empty` };
                            }
                            else if (e && e.code === "23505") {
                                throw { err_msg: `Connection ${JSON.stringify(con.name)} already exists` };
                            }
                            throw e;
                        }
                    },
                    deleteConnection: async (id) => {
                        return db.connections.delete({ id, user_id: user.id }, { returning: "*" });
                    },
                    startConnection: async (con_id) => {
                        const con = await db.connections.findOne({ id: con_id });
                        if (!con)
                            throw "Connection not found";
                        // @ts-ignore
                        await testDBConnection(con);
                        const socket_path = `/prj/${con_id}-dashboard/s`;
                        try {
                            if (prgl_connections[con.id]) {
                                if (prgl_connections[con.id].socket_path !== socket_path) {
                                    restartProc(() => {
                                        socket === null || socket === void 0 ? void 0 : socket.emit("pls-restart", true);
                                    });
                                    if (prgl_connections[con.id].prgl) {
                                        console.log("destroying prgl", Object.keys(prgl_connections[con.id]));
                                        prgl_connections[con.id].prgl.destroy();
                                    }
                                }
                                else {
                                    console.log("reusing prgl", Object.keys(prgl_connections[con.id]));
                                    if (prgl_connections[con.id].error)
                                        throw prgl_connections[con.id].error;
                                    return socket_path;
                                }
                            }
                            console.log("creating prgl", Object.keys(prgl_connections[con.id] || {}));
                            prgl_connections[con.id] = {
                                socket_path, con
                            };
                        }
                        catch (e) {
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
                            const _io = new socket_io_1.Server(http, { path: socket_path, maxHttpBufferSize: 1e8 });
                            const getRule = (user) => {
                                if (user) {
                                    return db.access_control.findOne({ connection_id: con.id, $existsJoined: { access_control_user_types: { user_type: user.type } } }); //  user_groups: { $contains: [user.type] }
                                }
                                return undefined;
                            };
                            try {
                                const prgl = await (0, prostgles_server_1.default)({
                                    dbConnection: getConnectionDetails(con),
                                    io: _io,
                                    auth: Object.assign(Object.assign({}, auth), { getUser: (sid, __, _, cl) => auth.getUser(sid, db, _db, cl), login: (sid, __, _) => auth.login(sid, db, _db), logout: (sid, __, _) => auth.logout(sid, db, _db), cacheSession: {
                                            getSession: (sid) => { var _a; return (_a = auth.cacheSession) === null || _a === void 0 ? void 0 : _a.getSession(sid, db, _db); }
                                        } }),
                                    onSocketConnect: (socket) => {
                                        log("onSocketConnect");
                                        return true;
                                    },
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
                                    publish: async ({ user, dbo }) => {
                                        var _a;
                                        if (user) {
                                            if (user.type === "admin")
                                                return "*";
                                            const ac = await getRule(user);
                                            console.log(user.type, ac);
                                            if (ac === null || ac === void 0 ? void 0 : ac.rule) {
                                                const rule = ac.rule;
                                                if (((_a = ac.rule) === null || _a === void 0 ? void 0 : _a.type) === "Run SQL" && ac.rule.allowSQL) {
                                                    return "*";
                                                }
                                                else if (rule.type === 'All views/tables' && (0, DboBuilder_1.isPlainObject)(rule.allowAllTables)) {
                                                    const { select, update, insert, delete: _delete } = rule.allowAllTables;
                                                    if (select || update || insert || _delete) {
                                                        return Object.keys(dbo).filter(k => dbo[k].find).reduce((a, v) => (Object.assign(Object.assign({}, a), { [v]: Object.assign({ select: select ? "*" : undefined }, (dbo[v].is_view ? {} : { update: update ? "*" : undefined,
                                                                insert: insert ? "*" : undefined,
                                                                delete: _delete ? "*" : undefined, })) })), {});
                                                    }
                                                }
                                            }
                                        }
                                        return undefined;
                                    },
                                    publishRawSQL: async () => {
                                        var _a;
                                        if ((user === null || user === void 0 ? void 0 : user.type) === "admin") {
                                            return true;
                                        }
                                        const ac = await getRule(user);
                                        if (((_a = ac === null || ac === void 0 ? void 0 : ac.rule) === null || _a === void 0 ? void 0 : _a.type) === "Run SQL" && ac.rule.allowSQL) {
                                            return true;
                                        }
                                        return undefined;
                                    },
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
                                        console.log("dbProj ready", con.db_name);
                                    }
                                });
                                prgl_connections[con.id] = {
                                    prgl,
                                    io,
                                    socket_path,
                                    con,
                                };
                            }
                            catch (e) {
                                reject(e);
                                prgl_connections[con.id] = {
                                    error: e,
                                    io,
                                    socket_path,
                                    con,
                                };
                            }
                        });
                        // prgl_connection = {
                        //   prgl: {}, 
                        //   io: _io,
                        //   socket_path,
                        //   con,
                        // }
                        return socket_path;
                    }
                };
            },
            publish: params => (0, publish_1.publish)(params, con),
            joins: "inferred",
            onReady: async (db, _db) => {
                let username = PRGL_USERNAME, password = PRGL_PASSWORD;
                if (!PRGL_USERNAME || !PRGL_PASSWORD) {
                    username = EMPTY_USERNAME;
                    password = EMPTY_PASSWORD;
                }
                // await db.users.delete(); 
                if (!(await db.users.count({ username }))) {
                    if (await HAS_EMPTY_USERNAME(db)) {
                        console.warn(`PRGL_USERNAME or PRGL_PASSWORD missing. Creating default user: ${username} with default password: ${password}`);
                    }
                    console.log((await db.users.count({ username })));
                    try {
                        const u = await db.users.insert({ username, password, type: "admin" }, { returning: "*" });
                        await _db.any("UPDATE users SET password = crypt(password, id::text), status = 'active' WHERE status IS NULL AND id = ${id};", u);
                    }
                    catch (e) {
                        console.error(e);
                    }
                    console.log("Added users: ", await db.users.find({ username }));
                }
                console.log("Prostgles UI is running on port ", PORT);
            },
        });
    }
    catch (err) {
        throw err;
    }
};
(async () => {
    let error, tries = 0;
    let interval = setInterval(async () => {
        try {
            await getDBS();
            tries = 6;
            error = null;
            // clearInterval(interval)
        }
        catch (err) {
            console.log("getDBS", err);
            error = err;
            tries++;
        }
        if (tries > 5) {
            clearInterval(interval);
            app.get("/dbs", (req, res) => {
                if (error) {
                    res.json({ err: error });
                }
                else {
                    res.json({ ok: true });
                }
            });
            if (error)
                app.get("*", (req, res) => {
                    console.log(req.originalUrl, req);
                    res.sendFile(path_1.default.join(__dirname + '/../../client/build/index.html'));
                });
            return;
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
})();
app.post("/dbs", async (req, res) => {
    const { db_conn, db_user, db_pass, db_host, db_port, db_name, db_ssl } = req.body;
    if (!db_conn || !db_host) {
        res.json({ ok: false });
    }
    try {
        await testDBConnection({ db_conn, db_user, db_pass, db_host, db_port, db_name, db_ssl });
        res.json({ msg: "DBS changed. Restart system" });
    }
    catch (err) {
        res.json({ err });
    }
});
/* Get nested property from an object */
function get(obj, propertyPath) {
    let p = propertyPath, o = obj;
    if (!obj)
        return obj;
    if (typeof p === "string")
        p = p.split(".");
    return p.reduce((xs, x) => {
        if (xs && xs[x]) {
            return xs[x];
        }
        else {
            return undefined;
        }
    }, o);
}
exports.get = get;
function logProcess(proc) {
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
function restartProc(cb) {
    console.warn("Restarting process");
    if (process.env.process_restarting) {
        delete process.env.process_restarting;
        // Give old process one second to shut down before continuing ...
        setTimeout(() => {
            cb === null || cb === void 0 ? void 0 : cb();
            restartProc();
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
//# sourceMappingURL=index.js.map