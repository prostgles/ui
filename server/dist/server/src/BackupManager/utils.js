"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeLogs = exports.getConnectionEnvVars = exports.addOptions = exports.getSSLEnvVars = exports.bytesToSize = exports.getBkp = exports.getFileMgr = exports.getConnectionUri = void 0;
const path_1 = __importDefault(require("path"));
const FileManager_1 = require("prostgles-server/dist/FileManager/FileManager");
const electronConfig_1 = require("../electronConfig");
const getConnectionDetails_1 = require("../connectionUtils/getConnectionDetails");
const BackupManager_1 = require("./BackupManager");
const utils_1 = require("../../../commonTypes/utils");
const cloudClients_1 = require("../enterprise/cloudClients");
const getConnectionUri = (c) => c.db_conn || `postgres://${c.db_user}:${c.db_pass || ""}@${c.db_host || "localhost"}:${c.db_port || "5432"}/${c.db_name}`;
exports.getConnectionUri = getConnectionUri;
async function getFileMgr(dbs, credId) {
    const localFolderPath = path_1.default.resolve((0, electronConfig_1.getRootDir)() + '/' + BackupManager_1.BACKUP_FOLDERNAME);
    let cred;
    if (credId) {
        cred = await dbs.credentials.findOne({ id: credId, type: "s3" });
        if (!cred)
            throw new Error("Could not find the credentials");
    }
    const fileMgr = new FileManager_1.FileManager(cred ? (0, cloudClients_1.getCloudClient)({ accessKeyId: cred.key_id, secretAccessKey: cred.key_secret, Bucket: cred.bucket, region: cred.region }) : { localFolderPath });
    return { fileMgr, cred };
}
exports.getFileMgr = getFileMgr;
async function getBkp(dbs, bkpId) {
    const bkp = await dbs.backups.findOne({ id: bkpId });
    if (!bkp)
        throw new Error("Could not find the backup");
    const { cred, fileMgr } = await getFileMgr(dbs, bkp.credential_id);
    return {
        bkp, cred, fileMgr
    };
}
exports.getBkp = getBkp;
function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0)
        return '0 Byte';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)) + "");
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
}
exports.bytesToSize = bytesToSize;
function getSSLEnvVars(c, connMgr) {
    let result = {};
    if (c.db_ssl) {
        result.PGSSLMODE = c.db_ssl;
    }
    if (c.db_pass) {
        result.PGPASSWORD = c.db_pass;
    }
    if (c.ssl_client_certificate) {
        result.PGSSLCERT = connMgr.getCertPath(c.id, "cert");
    }
    if (c.ssl_client_certificate_key) {
        result.PGSSLKEY = connMgr.getCertPath(c.id, "key");
    }
    if (c.ssl_certificate) {
        result.PGSSLROOTCERT = connMgr.getCertPath(c.id, "ca");
    }
    return result;
}
exports.getSSLEnvVars = getSSLEnvVars;
function addOptions(opts, extra) {
    return opts.concat(extra.filter(e => e[0]).flatMap(e => e[1]).map(e => e.toString()));
}
exports.addOptions = addOptions;
const getConnectionEnvVars = (c) => {
    const conDetails = (0, getConnectionDetails_1.getConnectionDetails)(c);
    return {
        PGHOST: conDetails.host,
        PGPORT: conDetails.port + "",
        PGDATABASE: conDetails.database,
        PGUSER: conDetails.user,
        PGPASSWORD: conDetails.password,
    };
};
exports.getConnectionEnvVars = getConnectionEnvVars;
const makeLogs = (newLogs, oldLogs, startTimeStr) => {
    let restore_logs = newLogs;
    if (startTimeStr) {
        const startTime = new Date(startTimeStr);
        const age = (0, utils_1.getAge)(+startTime, Date.now(), true);
        const padd = (v, len = 2) => v.toFixed(0).toString().padStart(len, "0");
        restore_logs = newLogs
            .split("\n")
            .filter(v => v)
            .map(v => v.includes("T+") ? v : `T+ ${[age.hours, age.minutes, age.seconds].map(v => padd(v)).join(":") + "." + padd(age.milliseconds, 3)}   ${v}`).join("\n");
    }
    return (oldLogs || "") + "\n" + restore_logs;
};
exports.makeLogs = makeLogs;
//# sourceMappingURL=utils.js.map