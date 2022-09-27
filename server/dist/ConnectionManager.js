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
exports.ConnectionManager = exports.PROSTGLES_CERTS_FOLDER = exports.DB_TRANSACTION_KEY = void 0;
const index_1 = require("./index");
const socket_io_1 = require("socket.io");
const prostgles_server_1 = __importDefault(require("prostgles-server"));
const PubSubManager_1 = require("prostgles-server/dist/PubSubManager");
const path_1 = __importDefault(require("path"));
const prostgles_types_1 = require("prostgles-types");
const authConfig_1 = require("./authConfig");
const fs = __importStar(require("fs"));
exports.DB_TRANSACTION_KEY = "dbTransactionProstgles";
exports.PROSTGLES_CERTS_FOLDER = "prostgles_certificates";
class ConnectionManager {
    prgl_connections = {};
    http;
    app;
    wss;
    constructor(http, app) {
        this.http = http;
        this.app = app;
        this.setUpWSS();
    }
    getCertPath(conId, type) {
        return path_1.default.resolve(`${index_1.ROOT_DIR}/${exports.PROSTGLES_CERTS_FOLDER}/${conId}` + (type ? `/${type}.pem` : ""));
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
        let rootPath = path_1.default.resolve(`${index_1.ROOT_DIR}/${index_1.MEDIA_ROUTE_PREFIX}`);
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
    async startConnection(con_id, socket, dbs, _dbs, restartIfExists = false) {
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
        const con = await dbs.connections.findOne({ id: con_id });
        if (!con)
            throw "Connection not found";
        await (0, index_1.testDBConnection)(con);
        console.log("testDBConnection ok");
        const socket_path = `${index_1.API_PATH}/${con_id}-dashboard/s`;
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
            const _io = new socket_io_1.Server(http, { path: socket_path, maxHttpBufferSize: 1e8, cors: { origin: "*" } });
            const getRule = async (user) => {
                if (user) {
                    return await dbs.access_control.findOne({ connection_id: con.id, $existsJoined: { access_control_user_types: { user_type: user.type } } }); //  user_groups: { $contains: [user.type] }
                }
                return undefined;
            };
            try {
                let tableConfigOk = false;
                const tableConfig = con.table_config;
                console.log("RESTART CONNECTION ON TABLECONFIG CHANGE");
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
                const auth = (0, authConfig_1.getAuth)(this.app);
                const prgl = await (0, prostgles_server_1.default)({
                    dbConnection: (0, index_1.getConnectionDetails)(con),
                    io: _io,
                    auth: {
                        ...auth,
                        getUser: (sid, __, _, cl) => auth.getUser(sid, dbs, _dbs, cl),
                        login: (sid, __, _) => auth.login?.(sid, dbs, _dbs),
                        logout: (sid, __, _) => auth.logout?.(sid, dbs, _dbs),
                        cacheSession: {
                            getSession: (sid) => auth.cacheSession?.getSession(sid, dbs, _dbs)
                        }
                    },
                    onSocketConnect: (socket) => {
                        // log("onSocketConnect");
                        return true;
                    },
                    // tsGeneratedTypesDir: path.join(ROOT_DIR + '/connection_dbo/' + conId),
                    fileTable: (!tableConfig?.fileTable || !tableConfigOk) ? undefined : {
                        tableName: tableConfig.fileTable,
                        expressApp: this.app,
                        fileServeRoute: `${index_1.MEDIA_ROUTE_PREFIX}/${con_id}`,
                        ...(tableConfig.storageType?.type === "local" ? {
                            localConfig: {
                                /* Use path.resolve when using a relative path. Otherwise will get 403 forbidden */
                                localFolderPath: this.getFileFolderPath(con_id)
                            }
                        } : {
                            awsS3Config
                        }),
                        referencedTables: tableConfig.referencedTables,
                    },
                    watchSchema: Boolean(con.db_watch_shema),
                    // transactions: true,
                    // DEBUG_MODE: true,
                    // fileTable: { 
                    //   tableName:"filetable",
                    //   expressApp: app,
                    //   localConfig: {
                    //     localFolderPath: path.join(__dirname + `../${con.id}/media`)
                    //   },
                    // },
                    transactions: exports.DB_TRANSACTION_KEY,
                    joins: "inferred",
                    publish: async ({ user, dbo }) => {
                        if (user) {
                            if (user.type === "admin")
                                return "*";
                            const parseTableRules = (rules, isView = false) => {
                                const parseMethodFields = (obj) => {
                                    if (obj === true || obj === "*") {
                                        return obj;
                                    }
                                    else if ((0, prostgles_types_1.isObject)(obj)) {
                                        const forcedFilter = getFor(obj);
                                        const { fields } = obj;
                                        if ((0, prostgles_types_1.isObject)(fields)) {
                                            const vals = Object.values(fields);
                                            if (!vals.length) {
                                                throw "Invalid fields: empty object";
                                            }
                                            if (!(vals.every(v => v === 1 || v === true) ||
                                                vals.every(v => v === 0 || v === false))) {
                                            }
                                            else {
                                                throw "Invalid fields: must have only include or exclude. Cannot have both";
                                            }
                                        }
                                        return { fields, forcedFilter };
                                    }
                                    return undefined;
                                };
                                if (rules === true || rules === "*") {
                                    return true;
                                }
                                else if ((0, prostgles_types_1.isObject)(rules)) {
                                    return {
                                        select: parseMethodFields(rules.select),
                                        ...(!isView ? {
                                            insert: parseMethodFields(rules.insert),
                                            update: parseMethodFields(rules.update),
                                            delete: !!rules.delete,
                                        } : {})
                                    };
                                }
                            };
                            const ac = await getRule(user);
                            console.log(user.type, ac);
                            if (ac?.rule) {
                                const rule = ac.rule;
                                if (ac.rule?.type === "Run SQL" && ac.rule.allowSQL) {
                                    return "*";
                                }
                                else if (rule.type === 'All views/tables' && (0, prostgles_types_1.isObject)(rule.allowAllTables)) {
                                    const { select, update, insert, delete: _delete } = rule.allowAllTables;
                                    if (select || update || insert || _delete) {
                                        return Object.keys(dbo).filter(k => dbo[k].find).reduce((a, v) => ({ ...a, [v]: {
                                                select: select ? "*" : undefined,
                                                ...(dbo[v].is_view ? {} : {
                                                    update: update ? "*" : undefined,
                                                    insert: insert ? "*" : undefined,
                                                    delete: _delete ? "*" : undefined,
                                                })
                                            }
                                        }), {});
                                    }
                                }
                                else if (rule.type === "Custom" && rule.customTables) {
                                    return rule.customTables
                                        .filter((t) => dbo[t.tableName])
                                        .reduce((a, v) => ({
                                        ...a,
                                        [v.tableName]: parseTableRules((0, PubSubManager_1.omitKeys)(v, ["tableName"]), dbo[v.tableName].is_view)
                                    }), {});
                                }
                                else {
                                    console.error("Unexpected access control rule: ", rule);
                                }
                            }
                        }
                        return undefined;
                    },
                    publishRawSQL: async ({ user }) => {
                        if (user?.type === "admin") {
                            return true;
                        }
                        const ac = await getRule(user);
                        if (ac?.rule?.type === "Run SQL" && ac.rule.allowSQL) {
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
//# sourceMappingURL=ConnectionManager.js.map