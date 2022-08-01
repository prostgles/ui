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
exports.ConnectionManager = exports.PROSTGLES_CERTS_FOLDER = void 0;
const DboBuilder_1 = require("prostgles-server/dist/DboBuilder");
const index_1 = require("./index");
const socket_io_1 = require("socket.io");
const prostgles_server_1 = __importDefault(require("prostgles-server"));
const PubSubManager_1 = require("prostgles-server/dist/PubSubManager");
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs"));
exports.PROSTGLES_CERTS_FOLDER = "prostgles_certificates";
class ConnectionManager {
    constructor(http, app) {
        this.prgl_connections = {};
        this.http = http;
        this.app = app;
        this.setUpWSS();
    }
    getCertPath(conId, type) {
        return path_1.default.resolve(`${__dirname}/../${exports.PROSTGLES_CERTS_FOLDER}/${conId}` + (type ? `/${type}.pem` : ""));
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
        let rootPath = path_1.default.resolve(`${__dirname}/../${index_1.MEDIA_ROUTE_PREFIX}`);
        if (conId)
            return `${rootPath}/${conId}`;
        return rootPath;
    }
    getConnection(conId) {
        return this.prgl_connections[conId];
    }
    async disconnect(conId) {
        var _a;
        if (this.prgl_connections[conId]) {
            await ((_a = this.prgl_connections[conId].prgl) === null || _a === void 0 ? void 0 : _a.destroy());
            delete this.prgl_connections[conId];
            return true;
        }
        return false;
    }
    async startConnection(con_id, socket, dbs, _dbs, restartIfExists = false) {
        var _a, _b;
        const { http } = this;
        if (this.prgl_connections[con_id]) {
            if (restartIfExists) {
                await ((_a = this.prgl_connections[con_id].prgl) === null || _a === void 0 ? void 0 : _a.destroy());
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
        const socket_path = `/prj/${con_id}-dashboard/s`;
        try {
            if (this.prgl_connections[con.id]) {
                // When does the socket path change??!!!
                if (this.prgl_connections[con.id].socket_path !== socket_path) {
                    (0, index_1.restartProc)(() => {
                        socket === null || socket === void 0 ? void 0 : socket.emit("pls-restart", true);
                    });
                    if (this.prgl_connections[con.id].prgl) {
                        console.log("destroying prgl", Object.keys(this.prgl_connections[con.id]));
                        (_b = this.prgl_connections[con.id].prgl) === null || _b === void 0 ? void 0 : _b.destroy();
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
            var _a, _b, _c;
            const _io = new socket_io_1.Server(http, { path: socket_path, maxHttpBufferSize: 1e8 });
            const getRule = async (user) => {
                if (user) {
                    return dbs.access_control.findOne({ connection_id: con.id, $existsJoined: { access_control_user_types: { user_type: user.type } } }); //  user_groups: { $contains: [user.type] }
                }
                return undefined;
            };
            try {
                let tableConfigOk = false;
                const tableConfig = con.table_config;
                console.log("RESTART CONNECTION ON TABLECONFIG CHANGE");
                let awsS3Config;
                if (((_a = tableConfig === null || tableConfig === void 0 ? void 0 : tableConfig.storageType) === null || _a === void 0 ? void 0 : _a.type) === "S3") {
                    if (tableConfig.storageType.credentials_id) {
                        const s3Creds = await dbs.credentials.findOne({ id: tableConfig === null || tableConfig === void 0 ? void 0 : tableConfig.storageType.credentials_id, type: "s3" });
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
                else if (((_b = tableConfig === null || tableConfig === void 0 ? void 0 : tableConfig.storageType) === null || _b === void 0 ? void 0 : _b.type) === "local" && tableConfig.fileTable) {
                    tableConfigOk = true;
                }
                const prgl = await (0, prostgles_server_1.default)({
                    dbConnection: (0, index_1.getConnectionDetails)(con),
                    io: _io,
                    auth: Object.assign(Object.assign({}, index_1.auth), { getUser: (sid, __, _, cl) => index_1.auth.getUser(sid, dbs, _dbs, cl), login: (sid, __, _) => { var _a; return (_a = index_1.auth.login) === null || _a === void 0 ? void 0 : _a.call(index_1.auth, sid, dbs, _dbs); }, logout: (sid, __, _) => { var _a; return (_a = index_1.auth.logout) === null || _a === void 0 ? void 0 : _a.call(index_1.auth, sid, dbs, _dbs); }, cacheSession: {
                            getSession: (sid) => { var _a; return (_a = index_1.auth.cacheSession) === null || _a === void 0 ? void 0 : _a.getSession(sid, dbs, _dbs); }
                        } }),
                    onSocketConnect: (socket) => {
                        // log("onSocketConnect");
                        return true;
                    },
                    // tsGeneratedTypesDir: path.join(__dirname + '/../connection_dbo/'),
                    fileTable: (!(tableConfig === null || tableConfig === void 0 ? void 0 : tableConfig.fileTable) || !tableConfigOk) ? undefined : Object.assign(Object.assign({ tableName: tableConfig.fileTable, expressApp: this.app, fileServeRoute: `${index_1.MEDIA_ROUTE_PREFIX}/${con_id}` }, (((_c = tableConfig.storageType) === null || _c === void 0 ? void 0 : _c.type) === "local" ? {
                        localConfig: {
                            /* Use path.resolve when using a relative path. Otherwise will get 403 forbidden */
                            localFolderPath: this.getFileFolderPath(con_id)
                        }
                    } : {
                        awsS3Config
                    })), { referencedTables: tableConfig.referencedTables }),
                    // fileTable: con.id === "173ec813-f025-4233-8e8d-d6f66e86852b"? {
                    //   expressApp: this.app,
                    //   localConfig: {
                    //     /* Use path.resolve when using a relative path. Otherwise will get 403 forbidden */
                    //     localFolderPath: (`${2}/${con.id}`)
                    //   },
                    //   // referencedTables: {
                    //   //   media_files: "one"
                    //   // }, 
                    //   // awsS3Config:{
                    //   //   accessKeyId,
                    //   //   bucket,
                    //   //   region,
                    //   //   secretAccessKey
                    //   // },
                    //   fileServeRoute: this.getFileFolderPath(con.id)
                    // } : undefined,
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
                    joins: "inferred",
                    publish: async ({ user, dbo }) => {
                        var _a;
                        if (user) {
                            if (user.type === "admin")
                                return "*";
                            const parseTableRules = (rules, isView = false) => {
                                const parseMethodFields = (obj) => {
                                    if (obj === true || obj === "*") {
                                        return obj;
                                    }
                                    else if ((0, DboBuilder_1.isPlainObject)(obj) && (0, DboBuilder_1.isPlainObject)(obj.fields)) {
                                        const { fields } = obj;
                                        const vals = Object.values(fields);
                                        if (!vals.length) {
                                            console.error("Invalid fields: empty object");
                                        }
                                        else {
                                            if (vals.every(v => v === 1 || v === true) ||
                                                vals.every(v => v === 0 || v === false)) {
                                                return { fields };
                                            }
                                            else {
                                                console.error("Invalid fields: must have only include or exclude. Cannot have both");
                                            }
                                        }
                                    }
                                    return undefined;
                                };
                                if (rules === true || rules === "*") {
                                    return true;
                                }
                                else if ((0, DboBuilder_1.isPlainObject)(rules)) {
                                    return Object.assign({ select: parseMethodFields(rules.select) }, (!isView ? {
                                        insert: parseMethodFields(rules.insert),
                                        update: parseMethodFields(rules.update),
                                        delete: !!rules.delete,
                                    } : {}));
                                }
                            };
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
                                        return Object.keys(dbo).filter(k => dbo[k].find).reduce((a, v) => (Object.assign(Object.assign({}, a), { [v]: Object.assign({ select: select ? "*" : undefined }, (dbo[v].is_view ? {} : {
                                                update: update ? "*" : undefined,
                                                insert: insert ? "*" : undefined,
                                                delete: _delete ? "*" : undefined,
                                            })) })), {});
                                    }
                                }
                                else if (rule.type === "Custom" && rule.customTables) {
                                    return rule.customTables
                                        .filter((t) => dbo[t.tableName])
                                        .reduce((a, v) => (Object.assign(Object.assign({}, a), { [v.tableName]: parseTableRules((0, PubSubManager_1.omitKeys)(v, ["tableName"]), dbo[v.tableName].is_view) })), {});
                                }
                                else {
                                    console.error("Unexpected access control rule: ", rule);
                                }
                            }
                        }
                        return undefined;
                    },
                    publishRawSQL: async ({ user }) => {
                        var _a;
                        if ((user === null || user === void 0 ? void 0 : user.type) === "admin") {
                            return true;
                        }
                        const ac = await getRule(user);
                        if (((_a = ac === null || ac === void 0 ? void 0 : ac.rule) === null || _a === void 0 ? void 0 : _a.type) === "Run SQL" && ac.rule.allowSQL) {
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