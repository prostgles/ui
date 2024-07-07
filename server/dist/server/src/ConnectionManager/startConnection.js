"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getACRule = exports.startConnection = void 0;
const prostgles_server_1 = __importDefault(require("prostgles-server"));
const Prostgles_1 = require("prostgles-server/dist/Prostgles");
const prostgles_types_1 = require("prostgles-types");
const socket_io_1 = require("socket.io");
const publishUtils_1 = require("../../../commonTypes/publishUtils");
const authConfig_1 = require("../authConfig/authConfig");
const testDBConnection_1 = require("../connectionUtils/testDBConnection");
const index_1 = require("../index");
const ConnectionManager_1 = require("./ConnectionManager");
const ForkedPrglProcRunner_1 = require("./ForkedPrglProcRunner");
const connectionManagerUtils_1 = require("./connectionManagerUtils");
const Logger_1 = require("../Logger");
const startConnection = async function (con_id, dbs, _dbs, socket, restartIfExists = false) {
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
            if (prglInstance.socket_path !== socket_path) {
                (0, index_1.restartProc)(() => {
                    socket?.emit("pls-restart", true);
                });
                if (prglInstance.prgl) {
                    (0, index_1.log)("destroying prgl", Object.keys(prglInstance));
                    prglInstance.prgl.destroy();
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
            dbConf,
            isReady: false,
            connectionInfo,
            methodRunner: undefined,
            onMountRunner: undefined,
            tableConfigRunner: undefined,
            lastRestart: 0,
            isSuperUser: undefined,
        };
    }
    catch (e) {
        console.error(e);
        throw e;
    }
    return new Promise(async (resolve, reject) => {
        const _io = new socket_io_1.Server(http, { path: socket_path, maxHttpBufferSize: 1e8, cors: this.withOrigin });
        try {
            const hotReloadConfig = await ConnectionManager_1.getReloadConfigs.bind(this)(con, dbConf, dbs);
            const auth = (0, authConfig_1.getAuth)(this.app);
            const watchSchema = con.db_watch_shema ? "*" : false;
            const forkedPrglProcRunner = await ForkedPrglProcRunner_1.ForkedPrglProcRunner.create({ type: "run", dbConfId: dbConf.id, dbs, initArgs: { dbConnection: connectionInfo, watchSchema } });
            await this.setTableConfig(con.id, dbConf.table_config_ts, dbConf.table_config_ts_disabled)
                .catch(e => {
                dbs.alerts.insert({ severity: "error", message: "Table config was disabled due to error", database_config_id: dbConf.id });
                dbs.database_configs.update({ id: dbConf.id }, { table_config_ts_disabled: true });
            });
            await this.setOnMount(con.id, dbConf.on_mount_ts, dbConf.on_mount_ts_disabled)
                .catch(e => {
                dbs.alerts.insert({ severity: "error", message: "On mount was disabled due to error", database_config_id: dbConf.id });
                dbs.database_configs.update({ id: dbConf.id }, { on_mount_ts_disabled: true });
            });
            //@ts-ignored
            const prgl = await (0, prostgles_server_1.default)({
                dbConnection: connectionInfo,
                io: _io,
                auth: {
                    sidKeyName: auth.sidKeyName,
                    getUser: (sid, __, _, cl) => auth.getUser(sid, dbs, _dbs, cl),
                    login: (sid, __, _, ip_address) => auth.login(sid, dbs, _dbs, ip_address),
                    logout: (sid, __, _) => auth.logout(sid, dbs, _dbs),
                    cacheSession: {
                        getSession: (sid) => auth.cacheSession.getSession(sid, dbs)
                    }
                },
                ...hotReloadConfig,
                watchSchema,
                disableRealtime: con.disable_realtime ?? undefined,
                transactions: ConnectionManager_1.DB_TRANSACTION_KEY,
                joins: "inferred",
                //@ts-ignore
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
                            else if (dbPermissions.type === "All views/tables" && dbPermissions.allowAllTables.length) {
                                return Object.keys(dbo).filter(k => dbo[k].find).reduce((a, v) => ({
                                    ...a, [v]: {
                                        select: dbPermissions.allowAllTables.includes("select") ? "*" : undefined,
                                        ...(dbo[v]?.is_view ? {} : {
                                            update: dbPermissions.allowAllTables.includes("update") ? "*" : undefined,
                                            insert: dbPermissions.allowAllTables.includes("insert") ? "*" : undefined,
                                            delete: dbPermissions.allowAllTables.includes("delete") ? "*" : undefined,
                                        })
                                    }
                                }), {});
                            }
                            else if (dbPermissions.type === "Custom") {
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
                publishMethods: async ({ user }) => {
                    const result = {};
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
                            input: m.arguments.reduce((a, v) => ({ ...a, [v.name]: v }), {}), // v.type === "Lookup"? { lookup: v }: v
                            outputTable: m.outputTable ?? undefined,
                            run: async (args) => {
                                const sourceCode = (0, connectionManagerUtils_1.getCompiledTS)(m.run);
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
                                    return forkedPrglProcRunner.run({
                                        type: "run",
                                        code: sourceCode,
                                        validatedArgs,
                                        //@ts-ignore
                                        user,
                                    });
                                }
                                catch (err) {
                                    return Promise.reject(err);
                                }
                            }
                        };
                    });
                    return result;
                },
                DEBUG_MODE: true,
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
                onLog: async (e) => {
                    (0, Logger_1.addLog)(e, con_id);
                },
                onReady: async (params) => {
                    const { dbo: db, db: _db, reason, tables } = params;
                    if (this.prgl_connections[con.id]) {
                        if (this.prgl_connections[con.id].prgl) {
                            this.prgl_connections[con.id].prgl._db = _db;
                            this.prgl_connections[con.id].prgl.db = db;
                        }
                        this.prgl_connections[con.id].lastRestart = Date.now();
                    }
                    if (reason.type !== "prgl.restart" && reason.type !== "init") {
                        this.onConnectionReload(con.id, dbConf.id);
                    }
                    connectionManagerUtils_1.alertIfReferencedFileColumnsRemoved.bind(this)({ reason, tables, connId: con.id, db: _db });
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
                dbConf,
                connectionInfo,
                socket_path,
                con,
                isReady: false,
                methodRunner: forkedPrglProcRunner,
                onMountRunner: this.prgl_connections[con.id]?.onMountRunner,
                tableConfigRunner: this.prgl_connections[con.id]?.tableConfigRunner,
                isSuperUser: await (0, Prostgles_1.getIsSuperUser)(prgl._db),
                lastRestart: Date.now()
            };
            this.setSyncUserSub();
        }
        catch (e) {
            reject(e);
            this.prgl_connections[con.id] = {
                error: e,
                connectionInfo,
                dbConf,
                socket_path,
                con,
                isReady: false,
                methodRunner: undefined,
                onMountRunner: undefined,
                tableConfigRunner: undefined,
                lastRestart: 0,
                isSuperUser: undefined
            };
        }
    });
};
exports.startConnection = startConnection;
const getACRule = async (dbs, user, database_id) => {
    if (!user)
        return undefined;
    return await dbs.access_control.findOne({ database_id, $existsJoined: { access_control_user_types: { user_type: user.type } } });
};
exports.getACRule = getACRule;
//# sourceMappingURL=startConnection.js.map