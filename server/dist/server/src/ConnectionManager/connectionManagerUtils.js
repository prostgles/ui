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
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertIfReferencedFileColumnsRemoved = exports.getTableConfig = exports.getCompiledTableConfig = exports.getEvaledExports = exports.getRestApiConfig = exports.getCompiledTS = exports.parseTableConfig = exports.getDatabaseConfigFilter = void 0;
const prostgles_types_1 = require("prostgles-types");
const typescript_1 = __importStar(require("typescript"));
const __1 = require("..");
const cloudClients_1 = require("../cloudClients/cloudClients");
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
    if (tableConfig?.storageType.type === "S3") {
        if (tableConfig.storageType.credential_id) {
            const s3Creds = await dbs.credentials.findOne({ id: tableConfig.storageType.credential_id, type: "s3" });
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
    else if (tableConfig?.storageType.type === "local" && tableConfig.fileTable) {
        tableConfigOk = true;
    }
    const fileTable = (!tableConfig?.fileTable || !tableConfigOk) ? undefined : {
        tableName: tableConfig.fileTable,
        expressApp: conMgr.app,
        fileServeRoute: `${__1.MEDIA_ROUTE_PREFIX}/${connectionId}`,
        ...(tableConfig.storageType.type === "local" ? {
            localConfig: {
                /* Use path.resolve when using a relative path. Otherwise will get 403 forbidden */
                localFolderPath: conMgr.getFileFolderPath(connectionId)
            }
        } : { cloudClient }),
        referencedTables: tableConfig.referencedTables,
    };
    return { tableConfigOk, fileTable };
};
exports.parseTableConfig = parseTableConfig;
const getCompiledTS = (code) => {
    const sourceCode = typescript_1.default.transpile(code, {
        noEmit: false,
        target: typescript_1.ScriptTarget.ES2022,
        lib: ["ES2022"],
        module: typescript_1.ModuleKind.CommonJS,
        moduleResolution: typescript_1.ModuleResolutionKind.Node16,
    }, "input.ts");
    return sourceCode;
};
exports.getCompiledTS = getCompiledTS;
const getRestApiConfig = (conMgr, conId, dbConf) => {
    const res = dbConf.rest_api_enabled ? {
        expressApp: conMgr.app,
        routePrefix: `/rest-api/${conId}`
    } : undefined;
    return res;
};
exports.getRestApiConfig = getRestApiConfig;
const getEvaledExports = (code) => {
    /**
     * This is needed to ensure all named exports are returned in eval
     */
    const ending = "\n\nexports;";
    const sourceCode = (0, exports.getCompiledTS)(code + ending);
    return eval(sourceCode);
};
exports.getEvaledExports = getEvaledExports;
const getCompiledTableConfig = ({ table_config, table_config_ts }) => {
    if (table_config)
        return { tableConfig: table_config };
    if (!table_config_ts)
        return undefined;
    const res = (0, exports.getEvaledExports)(table_config_ts);
    if (!res.tableConfig)
        throw "A table_config_ts must export a const named 'tableConfig' ";
    return res;
};
exports.getCompiledTableConfig = getCompiledTableConfig;
const getTableConfig = (dbConf) => {
    return (0, exports.getCompiledTableConfig)(dbConf)?.tableConfig;
};
exports.getTableConfig = getTableConfig;
const alertIfReferencedFileColumnsRemoved = async function ({ connId, reason, tables, db }) {
    /** Remove dropped referenced file columns */
    const { dbConf, isSuperUser } = this.prgl_connections[connId] ?? {};
    const referencedTables = dbConf?.file_table_config?.referencedTables;
    if (isSuperUser && dbConf && this.dbs && referencedTables && (reason.type === "schema change" || reason.type === "TableConfig")) {
        const droppedFileColumns = [];
        Object.entries(referencedTables).map(([tableName, { referenceColumns }]) => {
            const table = tables.find(t => t.name === tableName);
            const missingCols = Object.keys(referenceColumns).filter(colName => !table?.columns.find(c => c.name === colName));
            if (missingCols.length) {
                droppedFileColumns.push({ tableName, missingCols });
            }
        });
        if (droppedFileColumns.length && !(await this.dbs.alerts.findOne({ database_config_id: dbConf.id, data: droppedFileColumns }))) {
            await this.dbs.alerts.insert({
                severity: "warning",
                title: "Storage columns missing",
                message: `Some file column configs are missing from database schema: ${droppedFileColumns.map(({ tableName, missingCols }) => `${tableName}: ${missingCols.join(", ")}`).join(", ")}`,
                database_config_id: dbConf.id,
                data: droppedFileColumns
            });
        }
    }
};
exports.alertIfReferencedFileColumnsRemoved = alertIfReferencedFileColumnsRemoved;
//# sourceMappingURL=connectionManagerUtils.js.map