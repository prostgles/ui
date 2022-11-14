"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.tout = exports.upsertConnection = exports.restartProc = exports.get = exports.onServerReady = exports.connMgr = exports.connectionChecker = exports.getBackupManager = exports.MEDIA_ROUTE_PREFIX = exports.log = exports.PROSTGLES_STRICT_COOKIE = exports.POSTGRES_SSL = exports.POSTGRES_USER = exports.POSTGRES_PORT = exports.POSTGRES_PASSWORD = exports.POSTGRES_HOST = exports.POSTGRES_DB = exports.POSTGRES_URL = exports.PRGL_PASSWORD = exports.PRGL_USERNAME = exports.API_PATH = void 0;
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const prostgles_server_1 = __importDefault(require("prostgles-server"));
const tableConfig_1 = require("./tableConfig");
const app = (0, express_1.default)();
const publishMethods_1 = require("./publishMethods");
const child_process_1 = require("child_process");
const ConnectionManager_1 = require("./ConnectionManager");
const authConfig_1 = require("./authConfig");
const electronConfig_1 = require("./electronConfig");
exports.API_PATH = "/api";
app.use(express_1.default.json({ limit: "100mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "100mb" }));
app.use(function (req, res, next) {
    res.setHeader('Content-Security-Policy', 
    // "default-src 'self'; font-src 'self'; img-src 'self'; script-src 'self'; style-src 'self'; frame-src 'self'"
    " script-src 'self'; frame-src 'self'; worker-src blob: 'self';" /* data import (papaparse) requires: worker-src blob: 'self' */);
    next();
});
// console.log("Connecting to state database" , process.env)
process.on('unhandledRejection', (reason, p) => {
    console.trace('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});
const http_1 = __importDefault(require("http"));
const http = http_1.default.createServer(app);
const ioPath = process.env.PRGL_IOPATH || "/iosckt";
const publish_1 = require("./publish");
const dotenv = require('dotenv');
const testDBConnection_1 = require("./connectionUtils/testDBConnection");
const validateConnection_1 = require("./connectionUtils/validateConnection");
const result = dotenv.config({ path: path_1.default.resolve(electronConfig_1.ROOT_DIR + '/../.env') });
_a = result?.parsed || {}, exports.PRGL_USERNAME = _a.PRGL_USERNAME, exports.PRGL_PASSWORD = _a.PRGL_PASSWORD, exports.POSTGRES_URL = _a.POSTGRES_URL, exports.POSTGRES_DB = _a.POSTGRES_DB, exports.POSTGRES_HOST = _a.POSTGRES_HOST, exports.POSTGRES_PASSWORD = _a.POSTGRES_PASSWORD, exports.POSTGRES_PORT = _a.POSTGRES_PORT, exports.POSTGRES_USER = _a.POSTGRES_USER, exports.POSTGRES_SSL = _a.POSTGRES_SSL, exports.PROSTGLES_STRICT_COOKIE = _a.PROSTGLES_STRICT_COOKIE;
const log = (msg, extra) => {
    console.log(...[`(server): ${(new Date()).toISOString()} ` + msg, extra].filter(v => v));
};
exports.log = log;
app.use(express_1.default.static(path_1.default.resolve(electronConfig_1.ROOT_DIR + "/../client/build"), { index: false }));
app.use(express_1.default.static(path_1.default.resolve(electronConfig_1.ROOT_DIR + "/../client/static"), { index: false }));
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
const publishUtils_1 = require("../../commonTypes/publishUtils");
const io = new socket_io_1.Server(http, {
    path: ioPath,
    maxHttpBufferSize: 100e100,
    cors: exports.connectionChecker.withOrigin
});
exports.connMgr = new ConnectionManager_1.ConnectionManager(http, app, exports.connectionChecker.withOrigin);
const startProstgles = async (con = DBS_CONNECTION_INFO) => {
    try {
        // console.log("Connecting to state database" , con, { POSTGRES_DB, POSTGRES_USER, POSTGRES_HOST }, process.env)
        if (!con.db_conn && !con.db_user && !con.db_name) {
            const conn = `
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
            return { conn };
        }
        try {
            await (0, testDBConnection_1.testDBConnection)(con, true);
        }
        catch (conn) {
            return { conn };
        }
        /**
         * Manual process
         */
        // await getPSQLQueries(con);
        const auth = (0, authConfig_1.getAuth)(app);
        const dbConnection = {
            connectionTimeoutMillis: 1000,
            host: con.db_host,
            port: +con.db_port || 5432,
            database: con.db_name,
            user: con.db_user,
            password: con.db_pass,
        };
        await (0, prostgles_server_1.default)({
            dbConnection,
            sqlFilePath: path_1.default.join(electronConfig_1.ROOT_DIR + '/src/init.sql'),
            io,
            tsGeneratedTypesDir: path_1.default.join(electronConfig_1.ROOT_DIR + '/../commonTypes/'),
            transactions: true,
            onSocketConnect: async ({ socket, dbo, db, getUser }) => {
                const user = await getUser();
                const sid = user?.sid;
                if (sid) {
                    dbo.sessions.update({ id: sid }, { is_connected: true });
                }
                const remoteAddress = socket?.conn?.remoteAddress;
                // log("onSocketConnect", { remoteAddress });
                await exports.connectionChecker.onSocketConnected({ sid, getUser: getUser });
                if (sid) {
                    const s = await dbo.sessions.findOne({ id: sid });
                    if (!s) {
                        console.log("onSocketConnect session missing ?!");
                    }
                    else if (Date.now() > +(new Date(+s?.expires))) {
                        console.log("onSocketConnect session expired ?!", s.id, Date.now());
                    }
                    else {
                        await dbo.sessions.update({ id: sid }, { last_used: new Date() });
                    }
                }
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
            onSocketDisconnect: async ({ dbo, getUser }) => {
                const user = await getUser();
                const sid = user?.sid;
                if (sid) {
                    dbo.sessions.update({ id: sid }, { is_connected: false });
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
                await insertStateDatabase(db, _db, con);
                await exports.connectionChecker.init(db, _db);
                await exports.connMgr.init(db);
                bkpManager ??= new BackupManager_1.default(db, exports.connMgr);
                console.log("Prostgles UI is running on port ", PORT);
            },
        });
        return { ok: true };
    }
    catch (err) {
        return { init: err };
    }
};
/** Add state db if missing */
const insertStateDatabase = async (db, _db, con) => {
    if (!(await db.connections.count())) { // , name: "Prostgles state database" // { user_id }
        const state_db = await (0, exports.upsertConnection)({
            ...con,
            user_id: null,
            name: "Prostgles UI state database",
            type: !con.db_conn ? 'Standard' : 'Connection URI',
            db_port: con.db_port || 5432,
            db_ssl: con.db_ssl || "disable",
            is_state_db: true,
        }, null, db);
        try {
            const SAMPLE_DB_LABEL = "Sample database";
            const SAMPLE_DB_NAME = "sample_database";
            const databases = (await _db.any(`SELECT datname FROM pg_database WHERE datistemplate = false;`)).map(({ datname }) => datname);
            if (!(await db.connections.findOne({ name: SAMPLE_DB_LABEL, db_name: SAMPLE_DB_NAME }))) {
                if (!state_db)
                    throw "state_db not found";
                if (!databases.includes(SAMPLE_DB_NAME)) {
                    await _db.any("CREATE DATABASE " + SAMPLE_DB_NAME);
                }
                const stateCon = { ...(0, PubSubManager_1.omitKeys)(state_db, ["id"]) };
                const validatedConnection = (0, validateConnection_1.validateConnection)({
                    ...stateCon,
                    type: "Standard",
                    name: SAMPLE_DB_LABEL,
                    db_name: SAMPLE_DB_NAME,
                });
                await (0, exports.upsertConnection)({
                    ...stateCon,
                    ...validatedConnection,
                    is_state_db: false,
                    name: SAMPLE_DB_LABEL,
                }, null, db);
            }
        }
        catch (err) {
            console.error("Failed to create sample database: ", err);
        }
    }
};
const setDBSRoutes = () => {
    const initState = getInitState();
    if (!initState.isElectron)
        return;
    const ele = (0, electronConfig_1.getElectronConfig)();
    if (!ele?.sidConfig.electronSid) {
        throw "Electron sid missing";
    }
    app.post("/dbs", async (req, res) => {
        const creds = (0, PubSubManager_1.pickKeys)(req.body, ["db_conn", "db_user", "db_pass", "db_host", "db_port", "db_name", "db_ssl", "type"]);
        if (req.body.validate) {
            try {
                const connection = (0, validateConnection_1.validateConnection)(creds);
                res.json({ connection });
            }
            catch (warning) {
                res.json({ warning });
            }
            return;
        }
        if (!creds.db_conn || !creds.db_host) {
            res.json({ warning: "db_conn or db_host Missing" });
            return;
        }
        try {
            await (0, testDBConnection_1.testDBConnection)(creds);
            const electronConfig = (0, electronConfig_1.getElectronConfig)?.();
            const startup = await tryStartProstgles(creds);
            if (!startup.ok) {
                throw startup;
            }
            electronConfig?.setCredentials(creds);
            res.json({ msg: "DBS changed. Restart system" });
        }
        catch (warning) {
            res.json({ warning });
            electronConfig?.setCredentials(undefined);
        }
    });
};
let _initState = {
    ok: false,
    loading: false,
    loaded: false,
};
let installedPrograms = {
    psql: "",
    pg_dump: "",
    pg_restore: "",
};
try {
    installedPrograms = {
        psql: (0, child_process_1.execSync)("which psql").toString() && (0, child_process_1.execSync)("psql --version").toString(),
        pg_dump: (0, child_process_1.execSync)("which pg_dump").toString() && (0, child_process_1.execSync)("pg_dump --version").toString(),
        pg_restore: (0, child_process_1.execSync)("which pg_restore").toString() && (0, child_process_1.execSync)("pg_restore --version").toString(),
    };
}
catch (e) {
    installedPrograms = undefined;
}
if (installedPrograms?.psql) {
}
const getInitState = () => {
    const eConfig = (0, electronConfig_1.getElectronConfig)?.();
    return {
        isElectron: !!eConfig?.isElectron,
        electronCredsProvided: !!eConfig?.hasCredentials(),
        ..._initState,
        canTryStartProstgles: !eConfig?.isElectron || eConfig.hasCredentials(),
        canDumpAndRestore: installedPrograms
    };
};
/** During page load we wait for init */
const awaitInit = () => {
    return new Promise((resolve, reject) => {
        if (!_initState.loaded && _initState && getInitState().electronCredsProvided) {
            const interval = setInterval(() => {
                if (_initState.loaded) {
                    resolve(_initState);
                    clearInterval(interval);
                }
            }, 200);
        }
        else {
            resolve(_initState);
        }
    });
};
const tryStartProstgles = async (con = DBS_CONNECTION_INFO) => {
    return new Promise((resolve, reject) => {
        let tries = 0;
        _initState.connectionError = null;
        _initState.loading = true;
        let interval = setInterval(async () => {
            try {
                const status = await startProstgles(con);
                _initState.connectionError = status.conn;
                _initState.initError = status.init;
                if (status.ok) {
                    console.log("startProstgles success! ");
                    tries = 6;
                }
                else {
                    tries++;
                }
                // clearInterval(interval)
            }
            catch (err) {
                console.error("startProstgles fail: ", err);
                _initState.initError = err;
                tries++;
            }
            const error = _initState.connectionError || _initState.initError;
            _initState.ok = !error;
            const result = (0, PubSubManager_1.pickKeys)(_initState, ["ok", "connectionError", "initError"]);
            if (tries > 5) {
                clearInterval(interval);
                setDBSRoutes();
                _initState.loading = false;
                _initState.loaded = true;
                if (!_initState.ok) {
                    reject(result);
                }
                else {
                    resolve(result);
                }
                return;
            }
        }, 2000);
    });
};
/**
 * Serve prostglesInitState
 */
app.get("/dbs", (req, res) => {
    const serverState = getInitState();
    res.json(serverState);
});
/* Must provide index.html if there is an error OR prostgles is loading */
const serveIndexIfNoCredentials = async (req, res, next) => {
    const { isElectron, ok, electronCredsProvided, connectionError, initError } = getInitState();
    const error = connectionError || initError;
    if (error || isElectron && !electronCredsProvided || _initState.loading) {
        await awaitInit();
        if (req.method === "GET" && !req.path.startsWith("/dbs")) {
            res.sendFile(path_1.default.resolve(electronConfig_1.ROOT_DIR + '/../client/build/index.html'));
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
 *  - start prostgles IF or WHEN creds provided
 *  - remove serve index after prostgles is ready
 *
 * If docker/default
 *  - serve prostglesInitState
 *  - try start prostgles
 *  - If failed to connect then also serve index
 */
let PORT = +(process.env.PRGL_PORT ?? 3004);
const electronConfig = (0, electronConfig_1.getElectronConfig)?.();
if (electronConfig) {
    PORT = electronConfig.port ?? 3099;
    const creds = electronConfig.getCredentials();
    if (creds) {
        tryStartProstgles(creds);
    }
    else {
        console.log("Electron: No credentials");
    }
    setDBSRoutes();
    // console.log("Starting electron on port: ", PORT);
}
else {
    tryStartProstgles();
    // console.log("Starting non-electron on port: ", PORT);
}
const onServerReadyListeners = [];
const onServerReady = async (cb) => {
    if (_initState.httpListening) {
        cb(_initState.httpListening.port);
    }
    else {
        onServerReadyListeners.push(cb);
    }
};
exports.onServerReady = onServerReady;
const server = http.listen(PORT, () => {
    const address = server.address();
    const port = (0, publishUtils_1.isObject)(address) ? address.port : PORT;
    _initState.httpListening = {
        port
    };
    onServerReadyListeners.forEach(cb => {
        cb(port);
    });
    console.log('Listening on port:', port);
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
const upsertConnection = async (con, user_id, dbs) => {
    const c = (0, validateConnection_1.validateConnection)({
        ...con,
        user_id,
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