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
exports.ConnectionManager = exports.PROSTGLES_CERTS_FOLDER = exports.getACRules = exports.getACRule = exports.DB_TRANSACTION_KEY = void 0;
const index_1 = require("./index");
const socket_io_1 = require("socket.io");
const publishUtils_1 = require("../../commonTypes/publishUtils");
const prostgles_server_1 = __importDefault(require("prostgles-server"));
const PubSubManager_1 = require("prostgles-server/dist/PubSubManager");
const path_1 = __importDefault(require("path"));
const authConfig_1 = require("./authConfig");
const fs = __importStar(require("fs"));
const testDBConnection_1 = require("./connectionUtils/testDBConnection");
const getConnectionDetails_1 = require("./connectionUtils/getConnectionDetails");
const electronConfig_1 = require("./electronConfig");
exports.DB_TRANSACTION_KEY = "dbTransactionProstgles";
const getACRule = async (dbs, user, connection_id) => {
    if (user) {
        return await dbs.access_control.findOne({ connection_id, $existsJoined: { access_control_user_types: { user_type: user.type } } }); //  user_groups: { $contains: [user.type] }
    }
    return undefined;
};
exports.getACRule = getACRule;
const getACRules = async (dbs, user) => {
    if (user) {
        return await dbs.access_control.find({ $existsJoined: { access_control_user_types: { user_type: user.type } } }); //  user_groups: { $contains: [user.type] }
    }
    return [];
};
exports.getACRules = getACRules;
exports.PROSTGLES_CERTS_FOLDER = "prostgles_certificates";
class ConnectionManager {
    prgl_connections = {};
    http;
    app;
    wss;
    withOrigin;
    dbs;
    db;
    connections;
    constructor(http, app, withOrigin) {
        this.http = http;
        this.app = app;
        this.withOrigin = withOrigin;
        this.setUpWSS();
    }
    conSub;
    init = async (dbs, db) => {
        this.dbs = dbs;
        this.db = db;
        await this.conSub?.unsubscribe();
        this.conSub = await this.dbs.connections.subscribe({}, {}, connections => {
            this.saveCertificates(connections);
            this.connections = connections;
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
    getConnection(conId) {
        return this.prgl_connections[conId];
    }
    getConnections() {
        return this.prgl_connections;
    }
    async disconnect(conId) {
        if (this.prgl_connections[conId]) {
            await this.prgl_connections[conId].prgl?.destroy();
            delete this.prgl_connections[conId];
            return true;
        }
        return false;
    }
    reloadFileStorage = async (connId) => {
        const c = this.getConnection(connId);
        const con = await this.dbs?.connections.findOne({ id: connId });
        if (!con || !c?.prgl)
            throw "Connection not found";
        const { fileTable } = await parseTableConfig(this.dbs, con, this);
        await c.prgl.update({ fileTable });
    };
    getConnectionPath = (con_id) => `${index_1.API_PATH}/${con_id}`;
    async startConnection(con_id, dbs, _dbs, socket, restartIfExists = false) {
        const { http } = this;
        if (this.prgl_connections[con_id]) {
            if (restartIfExists) {
                await this.prgl_connections[con_id].prgl?.destroy();
                delete this.prgl_connections[con_id];
            }
            else {
                return this.prgl_connections[con_id].socket_path;
            }
        }
        const con = await dbs.connections.findOne({ id: con_id }).catch(e => {
            console.error(142, e);
            return undefined;
        });
        if (!con)
            throw "Connection not found";
        await (0, testDBConnection_1.testDBConnection)(con);
        console.log("testDBConnection ok");
        const socket_path = `${this.getConnectionPath(con_id)}-dashboard/s`;
        try {
            if (this.prgl_connections[con.id]) {
                // When does the socket path change??!!!
                if (this.prgl_connections[con.id].socket_path !== socket_path) {
                    (0, index_1.restartProc)(() => {
                        socket?.emit("pls-restart", true);
                    });
                    if (this.prgl_connections[con.id].prgl) {
                        console.log("destroying prgl", Object.keys(this.prgl_connections[con.id]));
                        this.prgl_connections[con.id].prgl?.destroy();
                    }
                }
                else {
                    console.log("reusing prgl", Object.keys(this.prgl_connections[con.id]));
                    if (this.prgl_connections[con.id].error)
                        throw this.prgl_connections[con.id].error;
                    return socket_path;
                }
            }
            console.log("creating prgl", Object.keys(this.prgl_connections[con.id] || {}));
            this.prgl_connections[con.id] = {
                socket_path, con
            };
        }
        catch (e) {
            console.error(e);
            throw e;
        }
        return new Promise(async (resolve, reject) => {
            const _io = new socket_io_1.Server(http, { path: socket_path, maxHttpBufferSize: 1e8, cors: this.withOrigin });
            try {
                const { fileTable } = await parseTableConfig(dbs, con, this);
                const auth = (0, authConfig_1.getAuth)(this.app);
                const prgl = await (0, prostgles_server_1.default)({
                    dbConnection: (0, getConnectionDetails_1.getConnectionDetails)(con),
                    io: _io,
                    auth: {
                        ...auth,
                        getUser: (sid, __, _, cl) => auth.getUser(sid, dbs, _dbs, cl),
                        login: (sid, __, _, ip_address) => auth.login?.(sid, dbs, _dbs, ip_address),
                        logout: (sid, __, _) => auth.logout?.(sid, dbs, _dbs),
                        cacheSession: {
                            getSession: (sid) => auth.cacheSession?.getSession(sid, dbs, _dbs)
                        }
                    },
                    // tsGeneratedTypesDir: path.join(ROOT_DIR + '/connection_dbo/' + conId),
                    fileTable,
                    watchSchema: Boolean(con.db_watch_shema),
                    // watchSchema: (a) => {
                    //   console.log(a);
                    // },
                    // transactions: true,
                    // DEBUG_MODE: true,
                    transactions: exports.DB_TRANSACTION_KEY,
                    joins: "inferred",
                    publish: async ({ user, dbo, tables }) => {
                        if (user) {
                            if (user.type === "admin")
                                return "*";
                            const ac = await (0, exports.getACRule)(dbs, user, con.id);
                            if (ac?.rule) {
                                const { dbPermissions } = ac.rule;
                                if (dbPermissions.type === "Run SQL" && dbPermissions.allowSQL) {
                                    return "*";
                                }
                                else if (dbPermissions.type === 'All views/tables' && dbPermissions.allowAllTables.length) {
                                    return Object.keys(dbo).filter(k => dbo[k].find).reduce((a, v) => ({ ...a, [v]: {
                                            select: dbPermissions.allowAllTables.includes("select") ? "*" : undefined,
                                            ...(dbo[v].is_view ? {} : {
                                                update: dbPermissions.allowAllTables.includes("update") ? "*" : undefined,
                                                insert: dbPermissions.allowAllTables.includes("insert") ? "*" : undefined,
                                                delete: dbPermissions.allowAllTables.includes("delete") ? "*" : undefined,
                                            })
                                        }
                                    }), {});
                                }
                                else if (dbPermissions.type === "Custom" && dbPermissions.customTables) {
                                    // return (rule as CustomTableRules).customTables
                                    return dbPermissions.customTables
                                        .filter((t) => dbo[t.tableName])
                                        .reduce((a, v) => {
                                        const table = tables.find(({ name }) => name === v.tableName);
                                        if (!table)
                                            return {};
                                        return {
                                            ...a,
                                            [v.tableName]: (0, publishUtils_1.parseTableRules)((0, PubSubManager_1.omitKeys)(v, ["tableName"]), dbo[v.tableName].is_view, table.columns.map(c => c.name), { user: user })
                                        };
                                    }, {});
                                }
                                else {
                                    console.error("Unexpected access control rule: ", ac.rule);
                                }
                            }
                        }
                        return undefined;
                    },
                    publishRawSQL: async ({ user }) => {
                        if (user?.type === "admin") {
                            return true;
                        }
                        const ac = await (0, exports.getACRule)(dbs, user, con.id);
                        if (ac?.rule?.dbPermissions.type === "Run SQL" && ac.rule.dbPermissions.allowSQL) {
                            return true;
                        }
                        return false;
                    },
                    onReady: async (db, _db) => {
                        console.log("onReady connection", Object.keys(db));
                        // _db.any("SELECT current_database()").then(console.log)
                        resolve(socket_path);
                        console.log("dbProj ready", con.db_name);
                    }
                });
                this.prgl_connections[con.id] = {
                    prgl,
                    // io,
                    socket_path,
                    con,
                };
            }
            catch (e) {
                reject(e);
                this.prgl_connections[con.id] = {
                    error: e,
                    // io,
                    socket_path,
                    con,
                };
            }
        });
    }
}
exports.ConnectionManager = ConnectionManager;
const parseTableConfig = async (dbs, con, conMgr) => {
    let tableConfigOk = false;
    const con_id = con.id;
    const tableConfig = con.table_config;
    let awsS3Config;
    if (tableConfig?.storageType?.type === "S3") {
        if (tableConfig.storageType.credential_id) {
            const s3Creds = await dbs.credentials.findOne({ id: tableConfig?.storageType.credential_id, type: "s3" });
            if (s3Creds) {
                tableConfigOk = true;
                awsS3Config = {
                    accessKeyId: s3Creds.key_id,
                    secretAccessKey: s3Creds.key_secret,
                    bucket: s3Creds.bucket,
                    region: s3Creds.region
                };
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
        fileServeRoute: `${index_1.MEDIA_ROUTE_PREFIX}/${con_id}`,
        ...(tableConfig.storageType?.type === "local" ? {
            localConfig: {
                /* Use path.resolve when using a relative path. Otherwise will get 403 forbidden */
                localFolderPath: conMgr.getFileFolderPath(con_id)
            }
        } : {
            awsS3Config
        }),
        referencedTables: tableConfig.referencedTables,
    };
    return { tableConfig, tableConfigOk, fileTable };
};
//# sourceMappingURL=ConnectionManager.js.map