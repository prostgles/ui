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
const path_1 = __importDefault(require("path"));
const prostgles_types_1 = require("prostgles-types");
const authConfig_1 = require("./authConfig");
const fs = __importStar(require("fs"));
const testDBConnection_1 = require("./connectionUtils/testDBConnection");
const getConnectionDetails_1 = require("./connectionUtils/getConnectionDetails");
const electronConfig_1 = require("./electronConfig");
const typescript_1 = __importStar(require("typescript"));
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
        (0, index_1.log)("testDBConnection ok");
        const socket_path = `${this.getConnectionPath(con_id)}-dashboard/s`;
        try {
            if (this.prgl_connections[con.id]) {
                // When does the socket path change??!!!
                if (this.prgl_connections[con.id].socket_path !== socket_path) {
                    (0, index_1.restartProc)(() => {
                        socket?.emit("pls-restart", true);
                    });
                    if (this.prgl_connections[con.id].prgl) {
                        (0, index_1.log)("destroying prgl", Object.keys(this.prgl_connections[con.id]));
                        this.prgl_connections[con.id].prgl?.destroy();
                    }
                }
                else {
                    (0, index_1.log)("reusing prgl", Object.keys(this.prgl_connections[con.id]));
                    if (this.prgl_connections[con.id].error)
                        throw this.prgl_connections[con.id].error;
                    return socket_path;
                }
            }
            (0, index_1.log)("creating prgl", Object.keys(this.prgl_connections[con.id] || {}));
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
                            if (user.type === "admin") {
                                return "*";
                            }
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
                                    return dbPermissions.customTables
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
                            // const acRules = await dbs.access_control.find({ connection_id: con.id });
                            // acRules.map(r => {
                            //   r.rule.methods?.map(m => {
                            //     allowedMethods.push(m);
                            //   })
                            // })
                        }
                        else {
                            const ac = await (0, exports.getACRule)(dbs, user, con.id);
                            if (ac?.rule.methods?.length) {
                                allowedMethods = await dbs.published_methods.find({ connection_id: con.id, $existsJoined: { access_control_methods: { access_control_id: ac.id } } });
                            }
                        }
                        allowedMethods.forEach(m => {
                            result[m.name] = {
                                input: m.arguments.reduce((a, v) => ({ ...a, [v.name]: v }), {}),
                                outputTable: m.outputTable ?? undefined,
                                run: async (args) => {
                                    const sourceCode = typescript_1.default.transpile(m.run, {
                                        noEmit: false,
                                        target: typescript_1.ScriptTarget.ES2022,
                                        lib: ["ES2022"],
                                        module: typescript_1.ModuleKind.CommonJS,
                                        moduleResolution: typescript_1.ModuleResolutionKind.NodeJs,
                                    }, "input.ts");
                                    try {
                                        eval(sourceCode);
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
                                                catch (err) {
                                                    throw {
                                                        message: "Could not validate argument against schema",
                                                        argument: arg.name
                                                    };
                                                }
                                            }
                                            validatedArgs = args;
                                        }
                                        //@ts-ignore
                                        const methodResult = await exports.run(validatedArgs, { db, dbo, socket, tables, user });
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