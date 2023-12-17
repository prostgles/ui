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
exports.getCompiledTS = exports.getDatabaseConfigFilter = exports.ConnectionManager = exports.PROSTGLES_CERTS_FOLDER = exports.getACRules = exports.getACRule = exports.DB_TRANSACTION_KEY = void 0;
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const prostgles_server_1 = __importDefault(require("prostgles-server"));
const prostgles_types_1 = require("prostgles-types");
const socket_io_1 = require("socket.io");
const typescript_1 = __importStar(require("typescript"));
const publishUtils_1 = require("../../commonTypes/publishUtils");
const authConfig_1 = require("./authConfig");
const testDBConnection_1 = require("./connectionUtils/testDBConnection");
const electronConfig_1 = require("./electronConfig");
const cloudClients_1 = require("./enterprise/cloudClients");
const index_1 = require("./index");
const statusMonitor_1 = require("./methods/statusMonitor");
exports.DB_TRANSACTION_KEY = "dbTransactionProstgles";
const getACRule = async (dbs, user, database_id) => {
    if (user) {
        return await dbs.access_control.findOne({ database_id, $existsJoined: { access_control_user_types: { user_type: user.type } } });
    }
    return undefined;
};
exports.getACRule = getACRule;
const getACRules = async (dbs, user) => {
    if (user) {
        return await dbs.access_control.find({ $existsJoined: { access_control_user_types: { user_type: user.type } } });
    }
    return [];
};
exports.getACRules = getACRules;
const getRestApiConfig = (conMgr, conId, dbConf) => {
    const res = {
        restApi: dbConf.rest_api_enabled ? {
            expressApp: conMgr.app,
            routePrefix: `/rest-api/${conId}`
        } : undefined
    };
    return res;
};
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
    conSub;
    dbConfSub;
    init = async (dbs, db) => {
        this.dbs = dbs;
        this.db = db;
        await this.conSub?.unsubscribe();
        this.conSub = await this.dbs.connections.subscribe({}, {}, connections => {
            this.saveCertificates(connections);
            this.connections = connections;
        });
        await this.dbConfSub?.unsubscribe();
        this.dbConfSub = await this.dbs.database_configs.subscribe({}, { select: { "*": 1, connections: { id: 1 } } }, dbConfigs => {
            dbConfigs.forEach(conf => {
                conf.connections.forEach((c) => {
                    const prglCon = this.prgl_connections[c.id];
                    if (prglCon?.prgl) {
                        prglCon.prgl?.update(getRestApiConfig(this, c.id, conf));
                        if (conf.table_config_ts) {
                            try {
                                const sourceCode = (0, exports.getCompiledTS)(conf.table_config_ts);
                                const tableConfig = eval(sourceCode);
                                prglCon.prgl?.update({ tableConfig: tableConfig });
                            }
                            catch (err) {
                                console.error("Failed updating table config", err);
                            }
                        }
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
        let rootPath = path_1.default.resolve(`${(0, electronConfig_1.getRootDir)()}/${index_1.MEDIA_ROUTE_PREFIX}`);
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
        await statusMonitor_1.cdbCache[conId]?.$pool.end();
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
        const { fileTable } = await parseTableConfig({ type: "new", dbs, con, conMgr: this, newTableConfig });
        await prgl.update({ fileTable });
    };
    async startConnection(con_id, dbs, _dbs, socket, restartIfExists = false) {
        const { http } = this;
        if (this.prgl_connections[con_id]) {
            if (restartIfExists) {
                await this.prgl_connections[con_id]?.prgl?.destroy();
                delete this.prgl_connections[con_id];
            }
            else {
                if (this.prgl_connections[con_id]?.error) {
                    throw this.prgl_connections[con_id]?.error;
                }
                return this.prgl_connections[con_id]?.socket_path;
            }
        }
        const con = await dbs.connections.findOne({ id: con_id })
            .catch(e => {
            console.error(142, e);
            return undefined;
        });
        if (!con)
            throw "Connection not found";
        const dbConf = await dbs.database_configs.findOne({ $existsJoined: { connections: { id: con.id } } });
        if (!dbConf)
            throw "dbConf not found";
        const { connectionInfo, isSSLModeFallBack } = await (0, testDBConnection_1.testDBConnection)(con);
        (0, index_1.log)("testDBConnection ok" + (isSSLModeFallBack ? ". (sslmode=prefer fallback)" : ""));
        const socket_path = `${this.getConnectionPath(con_id)}-dashboard/s`;
        try {
            const prglInstance = this.prgl_connections[con.id];
            if (prglInstance) {
                // When does the socket path change??!!!
                if (prglInstance?.socket_path !== socket_path) {
                    (0, index_1.restartProc)(() => {
                        socket?.emit("pls-restart", true);
                    });
                    if (prglInstance?.prgl) {
                        (0, index_1.log)("destroying prgl", Object.keys(prglInstance));
                        prglInstance.prgl?.destroy();
                    }
                }
                else {
                    (0, index_1.log)("reusing prgl", Object.keys(prglInstance));
                    if (prglInstance.error)
                        throw prglInstance.error;
                    return socket_path;
                }
            }
            (0, index_1.log)("creating prgl", Object.keys(prglInstance || {}));
            this.prgl_connections[con.id] = {
                socket_path,
                con,
                isReady: false,
            };
        }
        catch (e) {
            console.error(e);
            throw e;
        }
        return new Promise(async (resolve, reject) => {
            const _io = new socket_io_1.Server(http, { path: socket_path, maxHttpBufferSize: 1e8, cors: this.withOrigin });
            try {
                const { fileTable } = await parseTableConfig({ type: "saved", dbs, con, conMgr: this });
                const auth = (0, authConfig_1.getAuth)(this.app);
                //@ts-ignored
                const prgl = await (0, prostgles_server_1.default)({
                    dbConnection: connectionInfo,
                    io: _io,
                    auth: {
                        sidKeyName: auth.sidKeyName,
                        getUser: (sid, __, _, cl) => auth.getUser(sid, dbs, _dbs, cl),
                        login: (sid, __, _, ip_address) => auth.login?.(sid, dbs, _dbs, ip_address),
                        logout: (sid, __, _) => auth.logout?.(sid, dbs, _dbs),
                        cacheSession: {
                            getSession: (sid) => auth.cacheSession.getSession(sid, dbs)
                        }
                    },
                    fileTable,
                    ...getRestApiConfig(this, con_id, dbConf),
                    watchSchema: Boolean(con.db_watch_shema) ? "*" : false,
                    transactions: exports.DB_TRANSACTION_KEY,
                    joins: "inferred",
                    publish: async ({ user, dbo, tables }) => {
                        if (user) {
                            if (user.type === "admin") {
                                return "*";
                            }
                            const ac = await (0, exports.getACRule)(dbs, user, dbConf.id);
                            if (ac) {
                                const { dbPermissions } = ac;
                                if (dbPermissions.type === "Run SQL" && dbPermissions.allowSQL) {
                                    return "*";
                                }
                                else if (dbPermissions.type === 'All views/tables' && dbPermissions.allowAllTables.length) {
                                    return Object.keys(dbo).filter(k => dbo[k].find).reduce((a, v) => ({ ...a, [v]: {
                                            select: dbPermissions.allowAllTables.includes("select") ? "*" : undefined,
                                            ...(dbo[v]?.is_view ? {} : {
                                                update: dbPermissions.allowAllTables.includes("update") ? "*" : undefined,
                                                insert: dbPermissions.allowAllTables.includes("insert") ? "*" : undefined,
                                                delete: dbPermissions.allowAllTables.includes("delete") ? "*" : undefined,
                                            })
                                        }
                                    }), {});
                                }
                                else if (dbPermissions.type === "Custom" && dbPermissions.customTables) {
                                    const publish = dbPermissions.customTables
                                        .filter((t) => dbo[t.tableName])
                                        .reduce((a, _v) => {
                                        const v = _v;
                                        const table = tables.find(({ name }) => name === v.tableName);
                                        if (!table)
                                            return {};
                                        const ptr = {
                                            ...a,
                                            [v.tableName]: (0, publishUtils_1.parseTableRules)((0, prostgles_types_1.omitKeys)(v, ["tableName"]), dbo[v.tableName].is_view, table.columns.map((c) => c.name), { user: user })
                                        };
                                        return ptr;
                                    }, {});
                                    return publish;
                                }
                                else {
                                    console.error("Unexpected access control rule: ", ac.rule);
                                }
                            }
                        }
                        return undefined;
                    },
                    publishMethods: async ({ db, dbo, socket, tables, user }) => {
                        let result = {};
                        /** Admin has access to all methods */
                        let allowedMethods = [];
                        if (user?.type === "admin") {
                            allowedMethods = await dbs.published_methods.find({ connection_id: con.id });
                        }
                        else {
                            const ac = await (0, exports.getACRule)(dbs, user, dbConf.id);
                            if (ac) {
                                allowedMethods = await dbs.published_methods.find({ connection_id: con.id, $existsJoined: { access_control_methods: { access_control_id: ac.id } } });
                            }
                        }
                        allowedMethods.forEach(m => {
                            result[m.name] = {
                                input: m.arguments.reduce((a, v) => ({ ...a, [v.name]: v }), {}),
                                outputTable: m.outputTable ?? undefined,
                                run: async (args) => {
                                    const sourceCode = (0, exports.getCompiledTS)(m.run);
                                    try {
                                        let validatedArgs = undefined;
                                        if (m.arguments.length) {
                                            /**
                                             * Validate args
                                             */
                                            for await (const arg of m.arguments) {
                                                let argType = (0, prostgles_types_1.omitKeys)(arg, ["name"]);
                                                if (arg.type === "Lookup" || arg.type === "Lookup[]") {
                                                    argType = {
                                                        ...(0, prostgles_types_1.omitKeys)(arg, ["type", "name", "optional"]),
                                                        lookup: {
                                                            ...arg.lookup,
                                                            type: "data"
                                                        }
                                                    };
                                                }
                                                const partialArgSchema = {
                                                    //@ts-ignore
                                                    type: { [arg.name]: argType }
                                                };
                                                const partialValue = (0, prostgles_types_1.pickKeys)(args, [arg.name]);
                                                try {
                                                    await _dbs.any("SELECT validate_jsonb_schema(${argSchema}::TEXT, ${args})", { args: partialValue, argSchema: partialArgSchema });
                                                }
                                                catch (error) {
                                                    throw {
                                                        message: "Could not validate argument against schema",
                                                        argument: arg.name,
                                                        error
                                                    };
                                                }
                                            }
                                            validatedArgs = args;
                                        }
                                        /* We now expect the method to be: `exports.run = (args, { db, dbo, user }) => Promise<any>` */
                                        eval(sourceCode);
                                        const methodResult = await db.tx(dbTX => {
                                            return exports.run(validatedArgs, { db: db, dbo: dbTX, socket, tables, user });
                                        });
                                        return methodResult;
                                    }
                                    catch (err) {
                                        return Promise.reject(err);
                                    }
                                }
                            };
                        });
                        return result;
                    },
                    publishRawSQL: async ({ user }) => {
                        if (user?.type === "admin") {
                            return true;
                        }
                        const ac = await (0, exports.getACRule)(dbs, user, dbConf.id);
                        if (ac?.dbPermissions.type === "Run SQL" && ac.dbPermissions.allowSQL) {
                            return true;
                        }
                        return false;
                    },
                    onReady: async (db, _db, reason) => {
                        console.log("onReady connection", Object.keys(db));
                        /**
                         * In some cases watchSchema does not work as expected (GRANT/REVOKE will not be observable to a less privileged db user)
                         */
                        const refreshSamedatabaseForOtherUsers = async () => {
                            const sameDbs = await dbs.connections.find({
                                "id.<>": con.id,
                                ...(0, prostgles_types_1.pickKeys)(con, ["db_host", "db_port", "db_name"])
                            });
                            sameDbs.forEach(({ id }) => {
                                if (this.prgl_connections[id]) {
                                    this.prgl_connections[id].isReady = false;
                                    this.prgl_connections[id]?.prgl?.restart();
                                }
                            });
                        };
                        //@ts-ignore
                        const isNotRecursive = reason.type !== "prgl.restart";
                        if (this.prgl_connections[con.id]?.isReady && isNotRecursive) {
                            refreshSamedatabaseForOtherUsers();
                        }
                        resolve(socket_path);
                        if (this.prgl_connections[con.id]) {
                            this.prgl_connections[con.id].isReady = true;
                        }
                        console.log("dbProj ready", con.db_name);
                    }
                });
                this.prgl_connections[con.id] = {
                    prgl,
                    // io,
                    socket_path,
                    con,
                    isReady: false,
                };
            }
            catch (e) {
                reject(e);
                this.prgl_connections[con.id] = {
                    error: e,
                    // io,
                    socket_path,
                    con,
                    isReady: false,
                };
            }
        });
    }
}
exports.ConnectionManager = ConnectionManager;
const getDatabaseConfigFilter = (c) => (0, prostgles_types_1.pickKeys)(c, ["db_name", "db_host", "db_port"]);
exports.getDatabaseConfigFilter = getDatabaseConfigFilter;
const parseTableConfig = async ({ con, conMgr, dbs, type, newTableConfig }) => {
    const connectionId = con.id;
    let tableConfigOk = false;
    let tableConfig = null;
    if (type === "saved") {
        const database_config = await dbs.database_configs.findOne((0, exports.getDatabaseConfigFilter)(con));
        if (!database_config) {
            return {
                fileTable: undefined,
                tableConfigOk: true
            };
        }
        tableConfig = database_config.file_table_config;
    }
    else {
        tableConfig = newTableConfig;
    }
    let cloudClient;
    if (tableConfig?.storageType?.type === "S3") {
        if (tableConfig.storageType.credential_id) {
            const s3Creds = await dbs.credentials.findOne({ id: tableConfig?.storageType.credential_id, type: "s3" });
            if (s3Creds) {
                tableConfigOk = true;
                cloudClient = (0, cloudClients_1.getCloudClient)({
                    accessKeyId: s3Creds.key_id,
                    secretAccessKey: s3Creds.key_secret,
                    Bucket: s3Creds.bucket,
                    region: s3Creds.region
                });
            }
        }
        if (!tableConfigOk) {
            console.error("Could not find S3 credentials for fileTable config. File storage will not be set up");
        }
    }
    else if (tableConfig?.storageType?.type === "local" && tableConfig.fileTable) {
        tableConfigOk = true;
    }
    const fileTable = (!tableConfig?.fileTable || !tableConfigOk) ? undefined : {
        tableName: tableConfig.fileTable,
        expressApp: conMgr.app,
        fileServeRoute: `${index_1.MEDIA_ROUTE_PREFIX}/${connectionId}`,
        ...(tableConfig.storageType?.type === "local" ? {
            localConfig: {
                /* Use path.resolve when using a relative path. Otherwise will get 403 forbidden */
                localFolderPath: conMgr.getFileFolderPath(connectionId)
            }
        } : { cloudClient }),
        referencedTables: tableConfig.referencedTables,
    };
    return { tableConfigOk, fileTable };
};
const getCompiledTS = (code) => {
    const sourceCode = typescript_1.default.transpile(code, {
        noEmit: false,
        target: typescript_1.ScriptTarget.ES2022,
        lib: ["ES2022"],
        module: typescript_1.ModuleKind.CommonJS,
        moduleResolution: typescript_1.ModuleResolutionKind.NodeJs,
    }, "input.ts");
    return sourceCode;
};
exports.getCompiledTS = getCompiledTS;
console.error("MUST ENSURE FILE/TABLE CONFIGS ARE SET UP CORRECTLY on update and on startup");
console.error("FINISH TABLECONFIG.table.onMount to ensure crypto example works");
//# sourceMappingURL=ConnectionManager.js.map