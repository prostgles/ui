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
exports.getTableConfig = exports.getRestApiConfig = exports.getCompiledTS = exports.parseTableConfig = exports.getDatabaseConfigFilter = void 0;
const __1 = require("..");
const typescript_1 = __importStar(require("typescript"));
const cloudClients_1 = require("../enterprise/cloudClients");
const prostgles_types_1 = require("prostgles-types");
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
        fileServeRoute: `${__1.MEDIA_ROUTE_PREFIX}/${connectionId}`,
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
exports.parseTableConfig = parseTableConfig;
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
const getRestApiConfig = (conMgr, conId, dbConf) => {
    const res = dbConf.rest_api_enabled ? {
        expressApp: conMgr.app,
        routePrefix: `/rest-api/${conId}`
    } : undefined;
    return res;
};
exports.getRestApiConfig = getRestApiConfig;
const getTableConfig = ({ table_config, table_config_ts }) => {
    if (table_config)
        return table_config;
    if (!table_config_ts)
        return undefined;
    const sourceCode = (0, exports.getCompiledTS)(table_config_ts);
    return eval(sourceCode);
};
exports.getTableConfig = getTableConfig;
//# sourceMappingURL=connectionManagerUtils.js.map