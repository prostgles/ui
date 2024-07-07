"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCDB = exports.cdbCache = exports.ConnectionManager = exports.PROSTGLES_CERTS_FOLDER = exports.getReloadConfigs = exports.getACRules = exports.DB_TRANSACTION_KEY = void 0;
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const prostgles_types_1 = require("prostgles-types");
const testDBConnection_1 = require("../connectionUtils/testDBConnection");
const electronConfig_1 = require("../electronConfig");
const index_1 = require("../index");
const ForkedPrglProcRunner_1 = require("./ForkedPrglProcRunner");
const connectionManagerUtils_1 = require("./connectionManagerUtils");
const startConnection_1 = require("./startConnection");
exports.DB_TRANSACTION_KEY = "dbTransactionProstgles";
const getACRules = async (dbs, user) => {
    return await dbs.access_control.find({ $existsJoined: { access_control_user_types: { user_type: user.type } } });
};
exports.getACRules = getACRules;
const getReloadConfigs = async function (c, conf, dbs) {
    const restApi = (0, connectionManagerUtils_1.getRestApiConfig)(this, c.id, conf);
    const { fileTable } = await (0, connectionManagerUtils_1.parseTableConfig)({ type: "saved", dbs, con: c, conMgr: this });
    return {
        restApi,
        fileTable
    };
};
exports.getReloadConfigs = getReloadConfigs;
exports.PROSTGLES_CERTS_FOLDER = "prostgles_certificates";
class ConnectionManager {
    prgl_connections = {};
    http;
    app;
    // wss?: WebSocket.Server<WebSocket.WebSocket>;
    withOrigin;
    dbs;
    db;
    connections;
    database_configs;
    constructor(http, app, withOrigin) {
        this.http = http;
        this.app = app;
        this.withOrigin = withOrigin;
        this.setUpWSS();
    }
    getConnectionsWithPublicAccess = () => {
        return this.dbConfigs.filter(c => c.access_control_user_types.some(u => u.user_type === "public"));
    };
    /**
     * If a connection was reloaded due to permissions change (revoke/grant) then
     * restart all other related connections that did not get this event
     *
    */
    onConnectionReload = async (conId, dbConfId) => {
        const delay = 1000;
        setTimeout(() => {
            Object.entries(this.prgl_connections).forEach(async ([_conId, prglCon]) => {
                if (conId !== _conId && prglCon.dbConf.id === dbConfId && prglCon.lastRestart < (Date.now() - delay)) {
                    prglCon.prgl?.restart();
                }
            });
        }, delay);
    };
    setTableConfig = async (conId, table_config_ts, disabled) => {
        const prglCon = this.prgl_connections[conId];
        if (!prglCon)
            throw "Connection not found";
        if (!this.dbs)
            throw "Dbs not ready";
        if (prglCon.tableConfigRunner?.opts.type === "tableConfig" &&
            prglCon.tableConfigRunner.opts.table_config_ts === table_config_ts &&
            !disabled)
            return;
        prglCon.tableConfigRunner?.destroy();
        prglCon.tableConfigRunner = undefined;
        if (disabled)
            return;
        await this.dbs.database_config_logs.update({ id: prglCon.dbConf.id }, { table_config_logs: null });
        if (table_config_ts) {
            const tableConfig = await (0, connectionManagerUtils_1.getTableConfig)({ table_config_ts, table_config: null });
            prglCon.tableConfigRunner = await ForkedPrglProcRunner_1.ForkedPrglProcRunner.create({
                dbs: this.dbs,
                type: "tableConfig",
                table_config_ts,
                dbConfId: prglCon.dbConf.id,
                initArgs: {
                    dbConnection: prglCon.connectionInfo,
                    tableConfig
                },
            });
            return 1;
        }
    };
    setOnMount = async (conId, on_mount_ts, disabled) => {
        const prglCon = this.prgl_connections[conId];
        if (!prglCon)
            throw "Connection not found";
        if (!this.dbs)
            throw "Dbs not ready";
        if (prglCon.onMountRunner?.opts.type === "onMount" &&
            prglCon.onMountRunner.opts.on_mount_ts === on_mount_ts) {
            return;
        }
        prglCon.onMountRunner?.destroy();
        prglCon.onMountRunner = undefined;
        if (disabled)
            return;
        await this.dbs.database_config_logs.update({ id: prglCon.dbConf.id }, { on_mount_logs: null });
        if (on_mount_ts) {
            prglCon.onMountRunner = await ForkedPrglProcRunner_1.ForkedPrglProcRunner.create({
                dbs: this.dbs,
                type: "onMount",
                on_mount_ts,
                on_mount_ts_compiled: (0, connectionManagerUtils_1.getCompiledTS)(on_mount_ts),
                dbConfId: prglCon.dbConf.id,
                initArgs: { dbConnection: prglCon.connectionInfo },
            });
            return prglCon.onMountRunner.run({
                type: "onMount",
                code: (0, connectionManagerUtils_1.getCompiledTS)(on_mount_ts),
            });
        }
    };
    syncUsers = async (db, userTypes, syncableColumns) => {
        if (!db.users || !this.dbs || !syncableColumns.length)
            return;
        const lastUpdateDb = await db.users.findOne?.({}, { select: { last_updated: 1 }, orderBy: { last_updated: -1 } });
        const lastUpdateDbs = await this.dbs.users.findOne({ "type.$in": userTypes }, { select: { last_updated: 1 }, orderBy: { last_updated: -1 } });
        if (lastUpdateDbs?.last_updated && !lastUpdateDb || lastUpdateDbs?.last_updated && +(lastUpdateDb?.last_updated) < +(lastUpdateDbs.last_updated)) {
            const newUsers = await this.dbs.users.find({ "type.$in": userTypes, "last_updated.>": lastUpdateDb?.last_updated ?? 0 }, { limit: 1000, orderBy: { last_updated: 1 } });
            if (newUsers.length) {
                await db.users.insert?.(newUsers.map(u => (0, prostgles_types_1.pickKeys)(u, syncableColumns)), { onConflict: "DoUpdate" });
                this.syncUsers(db, userTypes, syncableColumns);
            }
        }
    };
    userSub;
    setSyncUserSub = async () => {
        await this.userSub?.unsubscribe();
        this.userSub = await this.dbs?.users.subscribe({}, { throttle: 1e3 }, async (users) => {
            for await (const [connId, prglCon] of Object.entries(this.prgl_connections)) {
                const db = prglCon.prgl?.db;
                const dbUsersHandler = db?.users;
                const dbConf = await this.dbs?.database_configs.findOne({ id: prglCon.dbConf.id });
                if (dbUsersHandler && dbConf?.sync_users) {
                    const userTypes = await this.dbs?.access_control_user_types.find({ $existsJoined: { "**.connections": { id: prglCon.con.id } } }, {
                        select: { user_type: 1 },
                        returnType: "values"
                    });
                    const dbCols = await dbUsersHandler.getColumns?.();
                    const dbsCols = await this.dbs?.users.getColumns?.();
                    if (!dbCols || !dbsCols)
                        return;
                    const requiredColumns = ["id", "last_updated"];
                    const excludedColumns = ["password"];
                    const syncableColumns = dbsCols
                        .filter(c => dbCols.some(dc => dc.insert && dc.name === c.name && dc.udt_name === c.udt_name))
                        .map(c => c.name)
                        .filter(c => !excludedColumns.includes(c));
                    if (userTypes && requiredColumns.every(c => syncableColumns.includes(c))) {
                        this.syncUsers(db, userTypes, syncableColumns);
                    }
                }
            }
        });
    };
    conSub;
    dbConfSub;
    dbConfigs = [];
    init = async (dbs, db) => {
        this.dbs = dbs;
        this.db = db;
        await this.conSub?.unsubscribe();
        this.conSub = await this.dbs.connections.subscribe({}, {}, connections => {
            this.saveCertificates(connections);
            this.connections = connections;
        });
        await this.dbConfSub?.unsubscribe();
        this.dbConfSub = await this.dbs.database_configs.subscribe({}, { select: { "*": 1, connections: { id: 1 }, access_control_user_types: "*", } }, dbConfigs => {
            this.dbConfigs = dbConfigs;
            dbConfigs.forEach(conf => {
                conf.connections.forEach(async (c) => {
                    const prglCon = this.prgl_connections[c.id];
                    if (prglCon?.prgl) {
                        const con = await this.getConnectionData(c.id);
                        const hotReloadConfig = await exports.getReloadConfigs.bind(this)(con, conf, dbs);
                        prglCon.prgl.update(hotReloadConfig);
                        this.setSyncUserSub();
                    }
                });
            });
            this.database_configs = dbConfigs;
        });
        /** Start connections if accessed */
        this.app.use(async (req, res, next) => {
            const { url } = req;
            if (this.connections && url.startsWith(index_1.API_PATH) && !Object.keys(this.prgl_connections).some(connId => url.includes(connId))) {
                const offlineConnection = this.connections.find(c => url.includes(c.id));
                if (offlineConnection && this.dbs && this.db) {
                    await this.startConnection(offlineConnection.id, this.dbs, this.db);
                }
            }
            next();
        });
        this.accessControlHotReload();
    };
    accessControlSkippedFirst = false;
    accessControlListeners;
    accessControlHotReload = async () => {
        if (!this.dbs || this.accessControlListeners?.length)
            return;
        const onAccessChange = (connIds) => {
            if (!this.accessControlSkippedFirst) {
                this.accessControlSkippedFirst = true;
                return;
            }
            console.log("onAccessChange");
            connIds.forEach(connection_id => {
                this.prgl_connections[connection_id]?.prgl?.restart();
            });
        };
        this.accessControlListeners = [
            await this.dbs.access_control.subscribe({}, {
                select: { database_id: 1, access_control_user_types: { access_control_id: 1 }, access_control_methods: { access_control_id: 1 } },
                throttle: 1000,
                throttleOpts: {
                    skipFirst: true
                }
            }, async (connections) => {
                const dbIds = Array.from(new Set(connections.map(c => c.database_id)));
                const d = await this.dbs?.connections.findOne({ $existsJoined: { database_configs: { id: { $in: dbIds } } } }, { select: { connIds: { $array_agg: ["id"] } } });
                onAccessChange(d?.connIds ?? []);
                this.setSyncUserSub();
            })
        ];
    };
    getCertPath(conId, type) {
        return path_1.default.resolve(`${(0, electronConfig_1.getRootDir)()}/${exports.PROSTGLES_CERTS_FOLDER}/${conId}` + (type ? `/${type}.pem` : ""));
    }
    saveCertificates(connections) {
        connections.forEach(c => {
            const hasCerts = c.ssl_certificate || c.ssl_client_certificate_key || c.ssl_client_certificate;
            if (hasCerts) {
                const folder = this.getCertPath(c.id);
                try {
                    fs.rmSync(folder, { recursive: true });
                    fs.mkdirSync(folder, { recursive: true, mode: 0o600 });
                    const utfOpts = { encoding: "utf-8", mode: 0o600 }; //
                    if (c.ssl_certificate) {
                        fs.writeFileSync(this.getCertPath(c.id, "ca"), c.ssl_certificate, utfOpts);
                    }
                    if (c.ssl_client_certificate) {
                        fs.writeFileSync(this.getCertPath(c.id, "cert"), c.ssl_client_certificate, utfOpts);
                    }
                    if (c.ssl_client_certificate_key) {
                        fs.writeFileSync(this.getCertPath(c.id, "key"), c.ssl_client_certificate_key, utfOpts);
                    }
                }
                catch (err) {
                    console.error("Failed writing ssl certificates:", err);
                }
            }
        });
    }
    setUpWSS() {
        // if(!this.wss){
        //   this.wss = new WebSocket.Server({ port: 3004, path: "/here" });
        // }
        // const clients = new Map();
        // this.wss.on('connection', (ws) => {
        //   const id = Date.now() + "." + Math.random()
        //   const color = Math.floor(Math.random() * 360);
        //   const metadata = { id, color };
        //   clients.set(ws, metadata);
        //   ws.on("message", console.log)
        //   ws.on("close", () => {
        //     clients.delete(ws);
        //   });
        // });
        // return this.wss;
    }
    getFileFolderPath(conId) {
        const rootPath = path_1.default.resolve(`${(0, electronConfig_1.getRootDir)()}/${index_1.MEDIA_ROUTE_PREFIX}`);
        if (conId)
            return `${rootPath}/${conId}`;
        return rootPath;
    }
    getConnectionDb(conId) {
        return this.prgl_connections[conId]?.prgl?.db;
    }
    async getNewConnectionDb(connId, opts) {
        return (0, testDBConnection_1.getDbConnection)(await this.getConnectionData(connId), opts);
    }
    getConnection(conId) {
        const c = this.prgl_connections[conId];
        if (!c?.prgl) {
            throw "Connection not found";
        }
        return c;
    }
    getConnections() {
        return this.prgl_connections;
    }
    async disconnect(conId) {
        await exports.cdbCache[conId]?.$pool.end();
        if (this.prgl_connections[conId]) {
            await this.prgl_connections[conId]?.prgl?.destroy();
            delete this.prgl_connections[conId];
            return true;
        }
        return false;
    }
    async getConnectionData(connection_id) {
        const con = await this.dbs?.connections.findOne({ id: connection_id });
        if (!con)
            throw "Connection not found";
        return con;
    }
    getConnectionPath = (con_id) => `${index_1.API_PATH}/${con_id}`;
    setFileTable = async (con, newTableConfig) => {
        const prgl = this.prgl_connections[con.id]?.prgl;
        const dbs = this.dbs;
        if (!dbs || !prgl)
            return;
        const { fileTable } = await (0, connectionManagerUtils_1.parseTableConfig)({ type: "new", dbs, con, conMgr: this, newTableConfig });
        await prgl.update({ fileTable });
    };
    startConnection = startConnection_1.startConnection.bind(this);
}
exports.ConnectionManager = ConnectionManager;
exports.cdbCache = {};
const getCDB = async (connId, opts, isTemporary = false) => {
    if (!exports.cdbCache[connId] || exports.cdbCache[connId]?.$pool.ending || isTemporary) {
        const db = await index_1.connMgr.getNewConnectionDb(connId, { application_name: "prostgles-status-monitor", ...opts });
        if (isTemporary)
            return db;
        exports.cdbCache[connId] = db;
    }
    const result = exports.cdbCache[connId];
    if (!result) {
        throw `Something went wrong: sql handler missing`;
    }
    return result;
};
exports.getCDB = getCDB;
//# sourceMappingURL=ConnectionManager.js.map