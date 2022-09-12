"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertConnection = exports.restartProc = exports.get = exports.connMgr = exports.MEDIA_ROUTE_PREFIX = exports.log = exports.PROSTGLES_STRICT_COOKIE = exports.POSTGRES_SSL = exports.POSTGRES_USER = exports.POSTGRES_PORT = exports.POSTGRES_PASSWORD = exports.POSTGRES_HOST = exports.POSTGRES_DB = exports.POSTGRES_URL = exports.PRGL_PASSWORD = exports.PRGL_USERNAME = exports.HAS_EMPTY_USERNAME = exports.EMPTY_PASSWORD = exports.EMPTY_USERNAME = exports.testDBConnection = exports.getConnectionDetails = exports.validateConnection = exports.ROOT_DIR = exports.API_PATH = void 0;
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const prostgles_server_1 = __importDefault(require("prostgles-server"));
const tableConfig_1 = require("./tableConfig");
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: "100mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "100mb" }));
const publishMethods_1 = require("./publishMethods");
const ConnectionManager_1 = require("./ConnectionManager");
const authConfig_1 = require("./authConfig");
exports.API_PATH = "/api";
/** Required to enable API access */
const cors_1 = __importDefault(require("cors"));
app.use((0, cors_1.default)({ origin: '*' }));
// console.log("Connecting to state database" , process.env)
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});
exports.ROOT_DIR = path_1.default.join(__dirname, "/../../..");
const http_1 = __importDefault(require("http"));
const http = http_1.default.createServer(app);
const ioPath = process.env.PRGL_IOPATH || "/iosckt";
const socket_io_1 = require("socket.io");
const io = new socket_io_1.Server(http, {
    path: ioPath,
    maxHttpBufferSize: 100e100,
});
const pg_promise_1 = __importDefault(require("pg-promise"));
const pgp = (0, pg_promise_1.default)();
const connection_string_1 = require("connection-string");
const publish_1 = require("./publish");
// const dns = require('dns');
const validateConnection = (c) => {
    let result = { ...c };
    if (c.type === "Connection URI") {
        if (!c.db_conn) {
            result.db_conn = (0, exports.validateConnection)({ ...result, type: "Standard" }).db_conn;
        }
        const cs = new connection_string_1.ConnectionString(result.db_conn);
        const params = cs.params ?? {};
        const { sslmode, host, port, dbname, user, password, } = params;
        result.db_host = cs.hosts[0].name ?? host;
        result.db_port = cs.hosts[0].port ?? +port;
        result.db_user = cs.user ?? user;
        result.db_pass = cs.password ?? password;
        result.db_name = cs.path[0] ?? dbname;
        result.db_ssl = sslmode;
        // result.type = "Standard"
    }
    else if (c.type === "Standard" || c.db_host) {
        const cs = new connection_string_1.ConnectionString(null, { protocol: "postgres" });
        cs.hosts = [{ name: c.db_host, port: c.db_port }];
        cs.password = c.db_pass;
        cs.user = c.db_user;
        cs.path = [c.db_name];
        cs.params = c.db_ssl ? { sslmode: c.db_ssl ?? "prefer" } : undefined;
        result.db_conn = cs.toString();
    }
    else
        throw "Not supported";
    result.db_user = result.db_user || "postgres";
    result.db_host = result.db_host || "localhost";
    result.db_ssl = result.db_ssl;
    result.db_port = result.db_port ?? 5432;
    return result;
};
exports.validateConnection = validateConnection;
const getConnectionDetails = (c) => {
    /**
     * Cannot use connection uri without having ssl issues
     * https://github.com/brianc/node-postgres/issues/2281
     */
    const getSSLOpts = (sslmode) => sslmode && sslmode !== "disable" ? ({
        ca: c.ssl_certificate ?? undefined,
        cert: c.ssl_client_certificate ?? undefined,
        key: c.ssl_client_certificate_key ?? undefined,
        rejectUnauthorized: c.ssl_reject_unauthorized ?? (sslmode === "require" && !!c.ssl_certificate || sslmode === "verify-ca" || sslmode === "verify-full")
    }) : undefined;
    if (c.type === "Connection URI") {
        const cs = new connection_string_1.ConnectionString(c.db_conn);
        const params = cs.params ?? {};
        const { sslmode, application_name = "prostgles" } = params;
        return {
            // connectionString: c.db_conn,
            application_name,
            host: cs.hosts[0].name,
            port: cs.hosts[0].port,
            user: cs.user,
            password: cs.password,
            database: cs.path[0],
            ssl: getSSLOpts(sslmode)
        };
    }
    return {
        database: c.db_name,
        user: c.db_user,
        password: c.db_pass,
        host: c.db_host,
        port: c.db_port,
        ssl: getSSLOpts(c.db_ssl)
    };
};
exports.getConnectionDetails = getConnectionDetails;
const testDBConnection = (_c, expectSuperUser = false) => {
    const con = (0, exports.validateConnection)(_c);
    if (typeof con !== "object" || !("db_host" in con) && !("db_conn" in con)) {
        throw "Incorrect database connection info provided. " +
            "\nExpecting: \
      db_conn: string; \
      OR \
      db_user: string; db_pass: string; db_host: string; db_port: number; db_name: string, db_ssl: string";
    }
    // console.log(db_conn)
    return new Promise(async (resolve, reject) => {
        let connOpts = (0, exports.getConnectionDetails)(con);
        const db = pgp({ ...connOpts, connectionTimeoutMillis: 1000 });
        db.connect()
            .then(async function (c) {
            // console.log(connOpts, "success, release connectio ", await db.any("SELECT current_database(), current_user, (select usesuper from pg_user where usename = CURRENT_USER)"))
            if (expectSuperUser) {
                const usessuper = await (0, Prostgles_1.isSuperUser)(c);
                if (!usessuper) {
                    reject("Provided user must be a superuser");
                    return;
                }
            }
            await c.done(); // success, release connection;
            resolve(true);
        }).catch(err => {
            // console.error("testDBConnection fail", {err, connOpts, con})
            reject(err instanceof Error ? err.message : JSON.stringify(err));
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
exports.testDBConnection = testDBConnection;
const dotenv = require('dotenv');
exports.EMPTY_USERNAME = "prostgles-no-auth-user", exports.EMPTY_PASSWORD = "prostgles";
const HAS_EMPTY_USERNAME = async (db) => {
    if (!exports.PRGL_USERNAME || !exports.PRGL_PASSWORD) {
        if (await db.users.count({ username: exports.EMPTY_USERNAME, status: "active" })) {
            return true;
        }
    }
    return false;
};
exports.HAS_EMPTY_USERNAME = HAS_EMPTY_USERNAME;
console.log(exports.ROOT_DIR);
const result = dotenv.config({ path: path_1.default.join(exports.ROOT_DIR + '/../.env') });
_a = result?.parsed || {}, exports.PRGL_USERNAME = _a.PRGL_USERNAME, exports.PRGL_PASSWORD = _a.PRGL_PASSWORD, exports.POSTGRES_URL = _a.POSTGRES_URL, exports.POSTGRES_DB = _a.POSTGRES_DB, exports.POSTGRES_HOST = _a.POSTGRES_HOST, exports.POSTGRES_PASSWORD = _a.POSTGRES_PASSWORD, exports.POSTGRES_PORT = _a.POSTGRES_PORT, exports.POSTGRES_USER = _a.POSTGRES_USER, exports.POSTGRES_SSL = _a.POSTGRES_SSL, exports.PROSTGLES_STRICT_COOKIE = _a.PROSTGLES_STRICT_COOKIE;
const PORT = +(process.env.PRGL_PORT ?? 3004);
http.listen(PORT);
const Prostgles_1 = require("prostgles-server/dist/Prostgles");
const log = (msg, extra) => {
    console.log(...[`(server): ${(new Date()).toISOString()} ` + msg, extra].filter(v => v));
};
exports.log = log;
app.use(express_1.default.static(path_1.default.join(exports.ROOT_DIR, "../client/build"), { index: false }));
app.use(express_1.default.static(path_1.default.join(exports.ROOT_DIR, "../client/static"), { index: false }));
/* AUTH */
const cookie_parser_1 = __importDefault(require("cookie-parser"));
app.use((0, cookie_parser_1.default)());
exports.MEDIA_ROUTE_PREFIX = `/prostgles_media`;
const DBS_CONNECTION_INFO = {
    type: !(process.env.POSTGRES_URL || exports.POSTGRES_URL) ? "Standard" : "Connection URI",
    db_conn: process.env.POSTGRES_URL || exports.POSTGRES_URL,
    db_name: process.env.POSTGRES_DB || exports.POSTGRES_DB,
    db_user: process.env.POSTGRES_USER || exports.POSTGRES_USER,
    db_pass: process.env.POSTGRES_PASSWORD || exports.POSTGRES_PASSWORD,
    db_host: process.env.POSTGRES_HOST || exports.POSTGRES_HOST,
    db_port: process.env.POSTGRES_PORT || exports.POSTGRES_PORT,
    db_ssl: process.env.POSTGRES_SSL || exports.POSTGRES_SSL,
};
const PubSubManager_1 = require("prostgles-server/dist/PubSubManager");
exports.connMgr = new ConnectionManager_1.ConnectionManager(http, app);
let conSub;
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
        await (0, exports.testDBConnection)(con, true);
        const auth = (0, authConfig_1.getAuth)(app);
        (0, prostgles_server_1.default)({
            dbConnection: {
                connectionTimeoutMillis: 1000,
                host: con.db_host,
                port: +con.db_port || 5432,
                database: con.db_name,
                user: con.db_user,
                password: con.db_pass,
            },
            sqlFilePath: path_1.default.join(exports.ROOT_DIR + '/src/init.sql'),
            io,
            tsGeneratedTypesDir: path_1.default.join(exports.ROOT_DIR + '/../commonTypes/'),
            transactions: true,
            onSocketConnect: async (_, dbo, db) => {
                (0, exports.log)("onSocketConnect", _?.conn?.remoteAddress);
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
            publishMethods: publishMethods_1.publishMethods,
            publish: params => (0, publish_1.publish)(params, con),
            joins: "inferred",
            onReady: async (db, _db) => {
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
                    exports.connMgr.saveCertificates(connections);
                });
                let username = exports.PRGL_USERNAME, password = exports.PRGL_PASSWORD;
                if (!exports.PRGL_USERNAME || !exports.PRGL_PASSWORD) {
                    username = exports.EMPTY_USERNAME;
                    password = exports.EMPTY_PASSWORD;
                }
                // await db.users.delete(); 
                if (!(await db.users.count({ username }))) {
                    if (await (0, exports.HAS_EMPTY_USERNAME)(db)) {
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
            if (error) {
                app.get("*", (req, res) => {
                    console.log(req.originalUrl);
                    res.sendFile(path_1.default.join(exports.ROOT_DIR + '../client/build/index.html'));
                });
            }
            return;
        }
    }, 2000);
})();
app.post("/testupload", (req, res) => {
    console.log(req.body);
});
app.post("/dbs", async (req, res) => {
    const { db_conn, db_user, db_pass, db_host, db_port, db_name, db_ssl } = req.body;
    if (!db_conn || !db_host) {
        res.json({ ok: false });
    }
    try {
        await (0, exports.testDBConnection)({ db_conn, db_user, db_pass, db_host, db_port, db_name, db_ssl });
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
            cb?.();
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
exports.restartProc = restartProc;
const upsertConnection = async (con, user, dbs) => {
    if (user?.type !== "admin" || !user.id) {
        throw "User missing or not admin";
    }
    const c = (0, exports.validateConnection)({
        ...con,
        user_id: user.id,
        last_updated: Date.now()
    });
    await (0, exports.testDBConnection)(con);
    try {
        let res;
        if (con.id) {
            if (!(await dbs.connections.findOne({ id: con.id }))) {
                throw "Connection not found: " + con.id;
            }
            res = await dbs.connections.update({ id: con.id }, (0, PubSubManager_1.omitKeys)(c, ["id"]), { returning: "*" });
        }
        else {
            res = await dbs.connections.insert(c, { returning: "*" });
        }
        return res;
    }
    catch (e) {
        console.error(e);
        if (e && e.code === "23502") {
            throw { err_msg: ` ${e.column} cannot be empty` };
        }
        throw e;
    }
};
exports.upsertConnection = upsertConnection;
//# sourceMappingURL=index.js.map