"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInitState = exports.tryStartProstgles = exports.startProstgles = exports.statePrgl = exports.initBackupManager = void 0;
const prostgles_server_1 = __importDefault(require("prostgles-server"));
const tableConfig_1 = require("./tableConfig");
const publishMethods_1 = require("./publishMethods");
const authConfig_1 = require("./authConfig");
const path_1 = __importDefault(require("path"));
const electronConfig_1 = require("./electronConfig");
const insertStateDatabase_1 = require("./insertStateDatabase");
const publish_1 = require("./publish");
const testDBConnection_1 = require("./connectionUtils/testDBConnection");
const setDBSRoutesForElectron_1 = require("./setDBSRoutesForElectron");
const PubSubManager_1 = require("prostgles-server/dist/PubSubManager/PubSubManager");
const _1 = require(".");
const BackupManager_1 = __importDefault(require("./BackupManager/BackupManager"));
const envVars_1 = require("./envVars");
const startDevHotReloadNotifier_1 = require("./startDevHotReloadNotifier");
let bkpManager;
const initBackupManager = async (db, dbs) => {
    bkpManager ??= await BackupManager_1.default.create(db, dbs, _1.connMgr);
    return bkpManager;
};
exports.initBackupManager = initBackupManager;
const isTesting = false; // !!process.env.PRGL_TEST;
const startProstgles = async ({ app, port, io, con = envVars_1.DBS_CONNECTION_INFO }) => {
    try {
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
        let validatedDbConnection;
        try {
            const tested = await (0, testDBConnection_1.testDBConnection)(con, true);
            if (tested.isSSLModeFallBack) {
                console.warn("sslmode=prefer fallback. Connecting through non-ssl");
            }
            validatedDbConnection = tested.connectionInfo;
        }
        catch (conn) {
            return { conn };
        }
        const IS_PROD = process.env.NODE_ENV === "production";
        /** Prevent electron access denied error (cannot edit files in the install directory in electron) */
        const tsGeneratedTypesDir = (IS_PROD || (0, electronConfig_1.getElectronConfig)()?.isElectron) ? undefined : path_1.default.join(electronConfig_1.actualRootDir + '/../commonTypes/');
        const auth = (0, authConfig_1.getAuth)(app);
        //@ts-ignore
        const prgl = await (0, prostgles_server_1.default)({
            dbConnection: {
                ...validatedDbConnection,
                connectionTimeoutMillis: 10 * 1000,
            },
            sqlFilePath: path_1.default.join(electronConfig_1.actualRootDir + '/src/init.sql'),
            io,
            tsGeneratedTypesDir,
            watchSchema: !!tsGeneratedTypesDir,
            watchSchemaType: "DDL_trigger",
            transactions: true,
            onSocketConnect: async ({ socket, dbo, db, getUser }) => {
                const user = await getUser();
                const userId = user?.user?.id;
                if (userId) {
                    await dbo.users.update({ id: userId, is_online: false }, { is_online: true });
                }
                const sid = user?.sid;
                await _1.connectionChecker.onSocketConnected({ sid, getUser: getUser });
                if (sid) {
                    const s = await dbo.sessions.findOne({ id: sid });
                    if (!s) {
                        console.log("onSocketConnect session missing ?!");
                    }
                    else if (Date.now() > +(new Date(+s?.expires))) {
                        console.log("onSocketConnect session expired ?!", s.id, Date.now());
                    }
                    else {
                        await dbo.sessions.update({ id: sid }, { last_used: new Date(), is_connected: true, socket_id: socket.id });
                    }
                }
                if (userId) {
                    /** Delete:
                     * - deleted workspaces
                     * - deleted/closed/detached (null wsp id)  non type=sql windows and links. Must keep detached SQL windows
                    */
                    const deletedWorkspaces = await dbo.workspaces.delete({ deleted: true, user_id: userId }, { returning: { id: 1 }, returnType: "values" });
                    const deletedWindows = await dbo.windows.delete({
                        $or: [
                            { deleted: true },
                            { closed: true, "type.<>": "sql" },
                        ]
                    }, {
                        returning: { id: 1 },
                        returnType: "values"
                    });
                    deletedWorkspaces;
                    deletedWindows;
                }
            },
            onSocketDisconnect: async ({ dbo, getUser }) => {
                //@ts-ignore
                const user = await getUser();
                const sid = user?.sid;
                if (sid) {
                    await dbo.sessions.update({ id: sid }, { is_connected: false });
                }
                if (user?.user && !(await dbo.sessions.count({ user_id: user.user.id, is_connected: true }))) {
                    dbo.users.update({ id: user.user.id }, { is_online: false });
                }
            },
            onLog: !isTesting ? undefined : async (e) => {
                const pref = [Date.now(), "server"];
                if (e.type === "sync" && e.tableName === "windows") {
                    console.log(...pref, JSON.stringify(e));
                }
                else if (e.type === "disconnect" || e.type === "connect") {
                    console.log(...pref, JSON.stringify(e));
                }
            },
            // DEBUG_MODE: true,
            tableConfig: tableConfig_1.tableConfig,
            tableConfigMigrations: { silentFail: false,
                version: 3,
                onMigrate: async ({ db, oldVersion }) => {
                    // if(!oldVersion){
                    //   return db.any("DROP TABLE IF EXISTS sessions CASCADE;")
                    // }  
                    // console.log({oldVersion}) 
                    // await db.any(`UPDATE connections SET backups_config = null;`);
                    // await db.any(`DELETE FROM access_control WHERE rule->>'dbPermissions' ilike '%fake_data%' `);
                    // await db.any(`DELETE FROM access_control `);
                }
            },
            publishRawSQL: async (params) => {
                const { user } = params;
                return Boolean(user && user.type === "admin");
            },
            auth: auth,
            publishMethods: publishMethods_1.publishMethods,
            publish: params => (0, publish_1.publish)(params, con),
            joins: "inferred",
            onReady: async (db, _db) => {
                /* Update stale data */
                await _1.connectionChecker.init(db, _db);
                await db.users.update({}, { is_online: false });
                await (0, insertStateDatabase_1.insertStateDatabase)(db, _db, con);
                await _1.connMgr.init(db, _db);
                bkpManager ??= await BackupManager_1.default.create(_db, db, _1.connMgr);
            },
        });
        exports.statePrgl = prgl;
        (0, startDevHotReloadNotifier_1.startDevHotReloadNotifier)({ io, port });
        return { ok: true };
    }
    catch (err) {
        return { init: err };
    }
};
exports.startProstgles = startProstgles;
let _initState = {
    ok: false,
    loading: false,
    loaded: false,
};
let connHistory = [];
const tryStartProstgles = async ({ app, io, port, con = envVars_1.DBS_CONNECTION_INFO }) => {
    const maxTries = 2;
    return new Promise((resolve, reject) => {
        let tries = 0;
        _initState.connectionError = null;
        _initState.loading = true;
        let interval = setInterval(async () => {
            const connHistoryItem = JSON.stringify(con);
            if (connHistory.includes(connHistoryItem)) {
                console.error("DUPLICATE UNFINISHED CONNECTION");
                return;
            }
            connHistory.push(connHistoryItem);
            try {
                const status = await (0, exports.startProstgles)({ app, io, con, port });
                _initState.connectionError = status.conn;
                _initState.initError = status.init;
                if (status.ok) {
                    tries = maxTries + 1;
                }
                else {
                    tries++;
                }
            }
            catch (err) {
                console.error("startProstgles fail: ", err);
                _initState.initError = err;
                tries++;
            }
            connHistory = connHistory.filter(v => v !== connHistoryItem);
            const error = _initState.connectionError || _initState.initError;
            _initState.ok = !error;
            const result = (0, PubSubManager_1.pickKeys)(_initState, ["ok", "connectionError", "initError"]);
            if (tries > maxTries) {
                clearInterval(interval);
                (0, setDBSRoutesForElectron_1.setDBSRoutesForElectron)(app, io, port);
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
        }, 10000);
    });
};
exports.tryStartProstgles = tryStartProstgles;
const getInitState = () => {
    const eConfig = (0, electronConfig_1.getElectronConfig)?.();
    return {
        isElectron: !!eConfig?.isElectron,
        electronCredsProvided: !!eConfig?.hasCredentials(),
        ..._initState,
        canDumpAndRestore: bkpManager?.installedPrograms,
        isDemoMode: (0, electronConfig_1.isDemoMode)(),
    };
};
exports.getInitState = getInitState;
//# sourceMappingURL=startProstgles.js.map