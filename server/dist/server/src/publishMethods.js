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
exports.checkIf = exports.is = exports.publishMethods = void 0;
const crypto = __importStar(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const index_1 = require("./index");
const preset_default_1 = require("@otplib/preset-default");
const Prostgles_1 = require("prostgles-server/dist/Prostgles");
const prostgles_types_1 = require("prostgles-types");
const publishUtils_1 = require("../../commonTypes/publishUtils");
const ConnectionManager_1 = require("./ConnectionManager/ConnectionManager");
const filterUtils_1 = require("../../commonTypes/filterUtils");
const ConnectionChecker_1 = require("./ConnectionChecker");
const testDBConnection_1 = require("./connectionUtils/testDBConnection");
const validateConnection_1 = require("./connectionUtils/validateConnection");
const demoDataSetup_1 = require("./demoDataSetup");
const electronConfig_1 = require("./electronConfig");
const statusMonitor_1 = require("./methods/statusMonitor");
const startProstgles_1 = require("./startProstgles");
const upsertConnection_1 = require("./upsertConnection");
const connectionManagerUtils_1 = require("./ConnectionManager/connectionManagerUtils");
const publishMethods = async (params) => {
    const { dbo: dbs, socket, db: _dbs } = params;
    const ip_address = socket.conn.remoteAddress;
    const user = params.user;
    const bkpManager = await (0, startProstgles_1.initBackupManager)(_dbs, dbs);
    if (!user || !user.id) {
        return {};
    }
    const getConnectionAndDbConf = async (connId) => {
        (0, exports.checkIf)({ connId }, "connId", "string");
        const c = await dbs.connections.findOne({ id: connId });
        if (!c)
            throw "Connection not found";
        const dbConf = await dbs.database_configs.findOne((0, connectionManagerUtils_1.getDatabaseConfigFilter)(c));
        if (!dbConf)
            throw "Connection not found";
        const db = index_1.connMgr.getConnectionDb(connId);
        if (!db)
            throw "db missing";
        return { c, dbConf, db };
    };
    const adminMethods = {
        makeFakeData: async (connId) => {
            const c = index_1.connMgr.getConnection(connId);
            const con = await dbs.connections.findOne({ id: connId });
            if (!c || !con)
                throw "bad connid";
            return (0, demoDataSetup_1.demoDataSetup)(c.prgl?._db, "sample");
        },
        disablePasswordless: async (newAdmin) => {
            const noPwdAdmin = await (0, ConnectionChecker_1.ADMIN_ACCESS_WITHOUT_PASSWORD)(dbs);
            if (!noPwdAdmin)
                throw "No passwordless admin found";
            await (0, ConnectionChecker_1.insertUser)(dbs, _dbs, { username: newAdmin.username, password: newAdmin.password, type: "admin" });
            await dbs.users.update({ id: noPwdAdmin.id }, { status: "disabled" });
            await dbs.sessions.delete({});
        },
        getConnectionDBTypes: async (conId) => {
            /** Maybe state connection */
            const con = await dbs.connections.findOne({ id: conId, is_state_db: true });
            if (con) {
                if (!startProstgles_1.statePrgl)
                    throw "statePrgl missing";
                return startProstgles_1.statePrgl.getTSSchema();
            }
            const c = index_1.connMgr.getConnection(conId);
            if (c) {
                return c.prgl?.getTSSchema();
            }
            console.error(`Not found`);
            return undefined;
        },
        getMyIP: () => {
            return index_1.connectionChecker.checkClientIP({ socket });
        },
        getConnectedIds: async () => {
            return Object.keys(index_1.connMgr.getConnections());
        },
        getDBSize: async (conId) => {
            const db = index_1.connMgr.getConnection(conId);
            const size = await db?.prgl?.db?.sql?.("SELECT pg_size_pretty( pg_database_size(current_database()) ) ", {}, { returnType: "value" });
            return size;
        },
        getIsSuperUser: async (conId) => {
            const db = index_1.connMgr.getConnection(conId);
            if (!db?.prgl?._db)
                throw "Connection instance not found";
            return (0, Prostgles_1.isSuperUser)(db.prgl._db);
        },
        getFileFolderSizeInBytes: (conId) => {
            const dirSize = (directory) => {
                if (!fs_1.default.existsSync(directory))
                    return 0;
                const files = fs_1.default.readdirSync(directory);
                const stats = files.flatMap(file => {
                    const fileOrPathDir = path_1.default.join(directory, file);
                    const stat = fs_1.default.statSync(fileOrPathDir);
                    if (stat.isDirectory()) {
                        return dirSize(fileOrPathDir);
                    }
                    return stat.size;
                });
                return stats.reduce((accumulator, size) => accumulator + size, 0);
            };
            if (conId && (typeof conId !== "string" || !index_1.connMgr.getConnection(conId))) {
                throw "Invalid/Inexisting connection id provided";
            }
            const dir = index_1.connMgr.getFileFolderPath(conId);
            return dirSize(dir);
        },
        testDBConnection: testDBConnection_1.testDBConnection,
        validateConnection: async (c) => {
            let warn = "";
            const connection = (0, validateConnection_1.validateConnection)(c);
            if (connection.db_ssl) {
                warn = "";
            }
            return { connection, warn };
        },
        createConnection: async (con) => {
            return (0, upsertConnection_1.upsertConnection)(con, user.id, dbs);
        },
        reloadSchema: async (conId) => {
            const conn = index_1.connMgr.getConnection(conId);
            if (conId && typeof conId !== "string" || !conn?.prgl) {
                throw "Invalid/Inexisting connection id provided";
            }
            await conn.prgl.restart();
        },
        deleteConnection: async (id, opts) => {
            try {
                return dbs.tx(async (t) => {
                    const con = await t.connections.findOne({ id });
                    if (con?.is_state_db)
                        throw "Cannot delete a prostgles state database connection";
                    if (opts?.dropDatabase) {
                        if (!con?.db_name)
                            throw "Unexpected: Database name missing";
                        const cdb = await (0, statusMonitor_1.getCDB)(con.id, undefined, true);
                        const anotherDatabaseNames = await cdb.any(`
              SELECT * FROM pg_catalog.pg_database 
              WHERE datname <> current_database() 
              AND NOT datistemplate
              ORDER BY datname = 'postgres' DESC
            `);
                        cdb.$pool.end();
                        const [anotherDatabaseName] = anotherDatabaseNames;
                        if (!anotherDatabaseName)
                            throw "Could not find another database";
                        const acdb = await (0, statusMonitor_1.getCDB)(con.id, { database: anotherDatabaseName.datname }, true);
                        const killDbConnections = () => {
                            return acdb.manyOrNone(`
                SELECT pg_terminate_backend(pid) 
                FROM pg_stat_activity 
                WHERE datname = \${db_name};
              `, con).catch(e => 1);
                        };
                        await killDbConnections();
                        await killDbConnections();
                        await acdb.any(`
              DROP DATABASE ${(0, prostgles_types_1.asName)(con.db_name)};
            `, con);
                        await index_1.connMgr.disconnect(con.id);
                    }
                    const conFilter = { connection_id: id };
                    await t.workspaces.delete(conFilter);
                    await t.access_control.delete({
                        $existsJoined: {
                            path: ["database_configs", "connections"],
                            filter: { id }
                        }
                    });
                    if (opts?.keepBackups) {
                        await t.backups.update(conFilter, { connection_id: null });
                    }
                    else {
                        const bkps = await t.backups.find(conFilter);
                        for await (const b of bkps) {
                            await bkpManager.bkpDelete(b.id, true);
                        }
                        await t.backups.delete(conFilter);
                    }
                    const result = await t.connections.delete({ id }, { returning: "*" });
                    /** delete orphaned database_configs */
                    await t.database_configs.delete({ $notExistsJoined: { connections: {} } });
                    return result;
                });
            }
            catch (err) {
                return Promise.reject(err);
            }
        },
        disconnect: async (conId) => {
            return index_1.connMgr.disconnect(conId);
        },
        pgDump: bkpManager.pgDump,
        pgRestore: async (arg1, opts) => bkpManager.pgRestore(arg1, undefined, opts),
        bkpDelete: bkpManager.bkpDelete,
        streamBackupFile: async (c, id, conId, chunk, sizeBytes, restore_options) => {
            if (c === "start" && id && conId && sizeBytes) {
                const s = bkpManager.getTempFileStream(id, user.id);
                await bkpManager.pgRestoreStream(id, conId, s.stream, sizeBytes, restore_options);
                return s.streamId;
            }
            else if (c === "chunk" && id && chunk) {
                return new Promise((resolve, reject) => {
                    bkpManager.pushToStream(id, chunk, (err) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve(1);
                        }
                    });
                });
            }
            else if (c === "end" && id) {
                bkpManager.closeStream(id);
            }
            else
                throw new Error("Not expected");
        },
        setTableConfig: async (connId, tableConfig = undefined) => {
            const { c, db, dbConf } = await getConnectionAndDbConf(connId);
            await dbs.tx(async (t) => {
                await index_1.connMgr.getConnection(connId)?.prgl?.update?.({ tableConfig: (tableConfig || undefined) });
                await t.database_configs.update({ id: dbConf.id }, { table_config: tableConfig });
            });
        },
        setFileStorage: async (connId, tableConfig, opts) => {
            const { c, db, dbConf } = await getConnectionAndDbConf(connId);
            let newTableConfig = tableConfig ? {
                ...tableConfig
            } : null;
            /** Enable file storage */
            if (tableConfig) {
                if (typeof tableConfig?.referencedTables !== "undefined") {
                    (0, exports.checkIf)(tableConfig, "referencedTables", "object");
                }
                if (tableConfig.referencedTables && Object.keys(tableConfig).length === 1) {
                    if (!dbConf.file_table_config)
                        throw "Must enable file storage first";
                    newTableConfig = { ...dbConf.file_table_config, ...tableConfig };
                }
                else {
                    (0, exports.checkIf)(tableConfig, "fileTable", "string");
                    (0, exports.checkIf)(tableConfig, "storageType", "object");
                    const { storageType } = tableConfig;
                    (0, exports.checkIf)(storageType, "type", "oneOf", ["local", "S3"]);
                    if (storageType?.type === "S3") {
                        if (!(await dbs.credentials.findOne({ id: storageType.credential_id }))) {
                            throw "Invalid credential_id provided";
                        }
                    }
                    const KEYS = ["fileTable", "storageType"];
                    if (dbConf.file_table_config && JSON.stringify((0, prostgles_types_1.pickKeys)(dbConf.file_table_config, KEYS)) !== JSON.stringify((0, prostgles_types_1.pickKeys)(tableConfig, KEYS))) {
                        throw "Cannot update " + KEYS.join("or");
                    }
                    newTableConfig = tableConfig;
                }
                /** Disable current file storage */
            }
            else {
                const fileTable = dbConf.file_table_config?.fileTable;
                if (!fileTable)
                    throw "Unexpected: fileTable already disabled";
                await db[ConnectionManager_1.DB_TRANSACTION_KEY](async (dbTX) => {
                    const fileTableHandler = dbTX[fileTable];
                    if (!fileTableHandler)
                        throw "Unexpected: fileTable table handler missing";
                    if (dbConf.file_table_config?.fileTable && (dbConf.file_table_config.storageType.type === "local" || dbConf.file_table_config.storageType.type === "S3" && !opts?.keepS3Data)) {
                        if (!fileTable || !fileTableHandler.delete) {
                            throw "Unexpected error. fileTable handler not found";
                        }
                        await fileTableHandler?.delete({});
                    }
                    if (!opts?.keepFileTable) {
                        await dbTX.sql("DROP TABLE ${fileTable:name} CASCADE", { fileTable });
                    }
                });
                newTableConfig = null;
            }
            const con = await dbs.connections.findOne({ id: connId });
            if (!con)
                throw "Connection not found";
            await dbs.tx?.(async (t) => {
                await index_1.connMgr.setFileTable(con, newTableConfig);
                await t.database_configs.update({ id: dbConf.id }, { file_table_config: newTableConfig });
            }).catch(err => {
                console.log({ err });
                return Promise.reject(err);
            });
        },
        deleteAccessRule: (id) => {
            return dbs.access_control.delete({ id });
        },
        upsertAccessRule: (ac) => {
            if (!ac)
                return dbs.access_control.insert(ac);
            return dbs.access_control.update({ id: ac.id }, ac);
        },
        getStatus: (connId) => (0, statusMonitor_1.getStatus)(connId, dbs),
        runConnectionQuery: async (connId, query, args) => {
            const cdb = await (0, statusMonitor_1.getCDB)(connId);
            return cdb.any(query, args);
        },
        getSampleSchemas: async () => {
            const path = (0, electronConfig_1.getRootDir)() + `/sample_schemas`;
            const files = fs_1.default.readdirSync(path);
            return files.map(name => {
                const extension = name.split(".").at(-1)?.toLowerCase() ?? "unknown";
                if (["sql", "ts"].includes(extension)) {
                    return {
                        name,
                        type: extension,
                        file: fs_1.default.readFileSync(`${path}/${name}`, { encoding: "utf-8" }),
                    };
                }
            }).filter(filterUtils_1.isDefined);
        },
        getCompiledTS: async (ts) => {
            return (0, connectionManagerUtils_1.getCompiledTS)(ts);
        },
        killPID: statusMonitor_1.killPID,
    };
    const userMethods = !user.id ? {} : {
        generateToken: async (days) => {
            if (!Number.isInteger(days)) {
                throw "Expecting an integer days but got: " + days;
            }
            const session = await dbs.sessions.insert({
                expires: Date.now() + days * 24 * 3600 * 1000,
                user_id: user.id,
                user_type: user.type,
                type: "api_token",
                ip_address
            }, { returning: "*" });
            return session.id;
        },
        create2FA: async () => {
            const userName = user.username;
            const service = 'Prostgles UI';
            const secret = preset_default_1.authenticator.generateSecret();
            const otpauth = preset_default_1.authenticator.keyuri(userName, service, secret);
            const recoveryCode = crypto.randomBytes(26).toString("hex");
            const hashedRecoveryCode = await dbs.sql("SELECT crypt(${recoveryCode}, ${uid}::text)", { uid: user.id, recoveryCode }, { returnType: "value" });
            await dbs.users.update({ id: user.id }, { "2fa": { secret, recoveryCode: hashedRecoveryCode, enabled: false } });
            return {
                url: otpauth,
                secret,
                recoveryCode
            };
        },
        enable2FA: async (token) => {
            const latestUser = await dbs.users.findOne({ id: user.id });
            const secret = latestUser?.["2fa"]?.secret;
            if (!secret)
                throw "Secret not found";
            //totp.verify({ secret, token }) -> Does not work.
            const isValid = preset_default_1.authenticator.check(token, secret);
            if (!isValid)
                throw "Invalid code";
            await dbs.users.update({ id: user.id }, { "2fa": { ...latestUser["2fa"], enabled: true } });
            return "ok";
        },
        disable2FA: () => {
            return dbs.users.update({ id: user.id }, { "2fa": null });
        },
        getAPITSDefinitions: () => {
            /** Must install them into the server folder! */
            const clientNodeModules = path_1.default.resolve(__dirname + "/../../../../client/node_modules/");
            const prostglesTypes = path_1.default.resolve(clientNodeModules + "/prostgles-types/dist");
            const prostglesClient = path_1.default.resolve(clientNodeModules + "/prostgles-client/dist");
            return [
                ...getTSFiles(prostglesClient).map(l => ({ ...l, name: "prostgles-client" })),
                ...getTSFiles(prostglesTypes).map(l => ({ ...l, name: "prostgles-types" })),
            ];
        }
    };
    return {
        ...userMethods,
        ...(user.type === "admin" ? adminMethods : undefined),
        startConnection: async (con_id) => {
            try {
                const socketPath = await index_1.connMgr.startConnection(con_id, dbs, _dbs, socket);
                return socketPath;
            }
            catch (error) {
                console.error("Could not start connection " + con_id, error);
                // Used to prevent data leak to client
                if (user.type === "admin") {
                    throw error;
                }
                else {
                    throw `Something went wrong when connecting to ${con_id}`;
                }
            }
        }
    };
};
exports.publishMethods = publishMethods;
function getTSFiles(dirPath) {
    return fs_1.default.readdirSync(dirPath).map(path => {
        if (path.endsWith(".d.ts")) {
            const content = fs_1.default.readFileSync(dirPath + "/" + path, { encoding: "utf8" });
            console.log(path, content);
            return { path, content };
        }
    }).filter(filterUtils_1.isDefined);
}
process.on("exit", code => {
    console.log(code);
});
exports.is = {
    string: (v, notEmtpy = true) => typeof v === "string" && (notEmtpy ? !!v.length : true),
    integer: (v) => Number.isInteger(v),
    number: (v) => Number.isFinite(v),
    object: (v) => (0, publishUtils_1.isObject)(v),
    oneOf: (v, vals) => vals.includes(v),
};
const checkIf = (obj, key, isType, arg1) => {
    const isOk = exports.is[isType](obj[key], arg1);
    if (!isOk)
        throw `${key} is not of type ${isType}${isType === "oneOf" ? `(${arg1})` : ""}. Source object: ${JSON.stringify(obj, null, 2)}`;
    return true;
};
exports.checkIf = checkIf;
//# sourceMappingURL=publishMethods.js.map