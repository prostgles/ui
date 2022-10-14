"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.tout = exports.upsertConnection = exports.restartProc = exports.get = exports.connMgr = exports.connectionChecker = exports.getBackupManager = exports.MEDIA_ROUTE_PREFIX = exports.log = exports.PROSTGLES_STRICT_COOKIE = exports.POSTGRES_SSL = exports.POSTGRES_USER = exports.POSTGRES_PORT = exports.POSTGRES_PASSWORD = exports.POSTGRES_HOST = exports.POSTGRES_DB = exports.POSTGRES_URL = exports.PRGL_PASSWORD = exports.PRGL_USERNAME = exports.ROOT_DIR = exports.API_PATH = void 0;
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const prostgles_server_1 = __importDefault(require("prostgles-server"));
const tableConfig_1 = require("./tableConfig");
const app = (0, express_1.default)();
const publishMethods_1 = require("./publishMethods");
const ConnectionManager_1 = require("./ConnectionManager");
const authConfig_1 = require("./authConfig");
exports.API_PATH = "/api";
app.use(express_1.default.json({ limit: "100mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "100mb" }));
// console.log("Connecting to state database" , process.env)
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});
exports.ROOT_DIR = path_1.default.join(__dirname, "/../../..");
const http_1 = __importDefault(require("http"));
const http = http_1.default.createServer(app);
const ioPath = process.env.PRGL_IOPATH || "/iosckt";
const publish_1 = require("./publish");
const dotenv = require('dotenv');
const testDBConnection_1 = require("./connectionUtils/testDBConnection");
const validateConnection_1 = require("./connectionUtils/validateConnection");
console.log(exports.ROOT_DIR);
const result = dotenv.config({ path: path_1.default.join(exports.ROOT_DIR + '/../.env') });
_a = result?.parsed || {}, exports.PRGL_USERNAME = _a.PRGL_USERNAME, exports.PRGL_PASSWORD = _a.PRGL_PASSWORD, exports.POSTGRES_URL = _a.POSTGRES_URL, exports.POSTGRES_DB = _a.POSTGRES_DB, exports.POSTGRES_HOST = _a.POSTGRES_HOST, exports.POSTGRES_PASSWORD = _a.POSTGRES_PASSWORD, exports.POSTGRES_PORT = _a.POSTGRES_PORT, exports.POSTGRES_USER = _a.POSTGRES_USER, exports.POSTGRES_SSL = _a.POSTGRES_SSL, exports.PROSTGLES_STRICT_COOKIE = _a.PROSTGLES_STRICT_COOKIE;
const PORT = +(process.env.PRGL_PORT ?? 3004);
http.listen(PORT);
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
const BackupManager_1 = __importDefault(require("./BackupManager"));
let bkpManager;
const getBackupManager = () => bkpManager;
exports.getBackupManager = getBackupManager;
const ConnectionChecker_1 = require("./ConnectionChecker");
exports.connectionChecker = new ConnectionChecker_1.ConnectionChecker(app);
const socket_io_1 = require("socket.io");
const io = new socket_io_1.Server(http, {
    path: ioPath,
    maxHttpBufferSize: 100e100,
    cors: exports.connectionChecker.withOrigin
});
exports.connMgr = new ConnectionManager_1.ConnectionManager(http, app, exports.connectionChecker.withOrigin);
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
        await (0, testDBConnection_1.testDBConnection)(con, true);
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
            onSocketConnect: async ({ socket, dbo, db }) => {
                const remoteAddress = socket?.conn?.remoteAddress;
                (0, exports.log)("onSocketConnect", remoteAddress);
                console.error("CHECK CORS");
                // if(await checkIfNoPWD(dbo) && remoteAddress.includes("127.0.0.1")) { //  === "::ffff:127.0.0.1"
                //   const errMsg = "Reject foreign requests if there is no auth";
                //   throw errMsg;
                // }
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
                await exports.connectionChecker.init(db, _db);
                await exports.connMgr.init(db);
                bkpManager ??= new BackupManager_1.default(db);
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
    const c = (0, validateConnection_1.validateConnection)({
        ...con,
        user_id: user.id,
        last_updated: Date.now()
    });
    await (0, testDBConnection_1.testDBConnection)(con);
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
const tout = (timeout) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(true);
        }, timeout);
    });
};
exports.tout = tout;
//# sourceMappingURL=index.js.map