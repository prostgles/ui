"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HOUR = exports.BKP_PREFFIX = exports.BACKUP_FOLDERNAME = void 0;
const path_1 = __importDefault(require("path"));
const stream_1 = require("stream");
const pgDump_1 = require("./pgDump");
const pgRestore_1 = require("./pgRestore");
const utils_1 = require("./utils");
const getInstalledPrograms_1 = require("./getInstalledPrograms");
exports.BACKUP_FOLDERNAME = "prostgles_backups";
exports.BKP_PREFFIX = "/" + exports.BACKUP_FOLDERNAME;
const check_disk_space_1 = __importDefault(require("check-disk-space"));
const electronConfig_1 = require("../electronConfig");
const checkAutomaticBackup_1 = require("./checkAutomaticBackup");
const FileManager_1 = require("prostgles-server/dist/FileManager/FileManager");
exports.HOUR = 3600 * 1000;
class BackupManager {
    tempStreams = {};
    installedPrograms;
    dbs;
    db;
    automaticBackupInterval;
    connMgr;
    dbConfSub;
    constructor(db, dbs, connMgr, installedPrograms) {
        this.db = db;
        this.dbs = dbs;
        this.connMgr = connMgr;
        this.installedPrograms = installedPrograms;
        const checkAutomaticBkps = async () => {
            const connections = await this.dbs.connections.find({ $existsJoined: { database_configs: { "backups_config->>enabled": "true" } } });
            for await (const con of connections) {
                await this.checkAutomaticBackup(con);
            }
        };
        this.automaticBackupInterval = setInterval(checkAutomaticBkps, exports.HOUR / 4);
        (async () => {
            await this.dbConfSub?.unsubscribe();
            this.dbConfSub = await dbs.database_configs.subscribe({}, { select: "", limit: 0 }, () => {
                checkAutomaticBkps();
            });
        })();
    }
    getCmd = (cmd) => {
        if (!this.installedPrograms)
            throw new Error("No installed programs");
        const { filePath, os } = this.installedPrograms;
        if (os === "Windows") {
            if (!filePath)
                throw new Error("No file path");
            return `${filePath}${cmd}.exe`;
        }
        return `${filePath}${cmd}`;
    };
    static create = async (db, dbs, connMgr) => {
        const installedPrograms = await (0, getInstalledPrograms_1.getInstalledPrograms)(db);
        return new BackupManager(db, dbs, connMgr, installedPrograms);
    };
    async destroy() {
        await this.dbConfSub?.unsubscribe();
        clearInterval(this.automaticBackupInterval);
    }
    checkIfEnoughSpace = async (conId) => {
        const dbSizeInBytes = await this.getDBSizeInBytes(conId);
        const diskSpace = await (0, check_disk_space_1.default)((0, electronConfig_1.getRootDir)());
        const minLimin = 100 * 1e6;
        if (diskSpace.free < minLimin) {
            const err = `There is not enough space on server for local backups:\nTotal: ${(0, FileManager_1.bytesToSize)(diskSpace.size)} \nRemaning: ${(0, FileManager_1.bytesToSize)(diskSpace.free)} \nRequired: ${(0, FileManager_1.bytesToSize)(minLimin)}`;
            return { ok: false, err, diskSpace, dbSizeInBytes };
        }
        else if (diskSpace.free - (1.1 * dbSizeInBytes) < 0) {
            const err = `There is not enough space on server for local backups:\nTotal: ${(0, FileManager_1.bytesToSize)(diskSpace.size)} \nRemaning: ${(0, FileManager_1.bytesToSize)(diskSpace.free)} \nRequired: 1.1*DB size on disk (${(0, FileManager_1.bytesToSize)(dbSizeInBytes)})`;
            return { ok: false, err, diskSpace, dbSizeInBytes };
        }
        else {
            return { ok: true, diskSpace, dbSizeInBytes };
        }
    };
    getDBSizeInBytes = async (conId) => {
        const db = await this.connMgr.getNewConnectionDb(conId, { allowExitOnIdle: true });
        const { size: result } = (await db.oneOrNone("SELECT pg_database_size(current_database()) as size  "));
        await db.$pool.end();
        return Number.isFinite(+result) ? result : 0;
    };
    pgDump = pgDump_1.pgDump.bind(this);
    pgRestore = pgRestore_1.pgRestore.bind(this);
    pgRestoreStream = async (fileName, conId, stream, sizeBytes, restore_options) => {
        const con = await this.dbs.connections.findOne({ id: conId });
        if (!con)
            throw new Error("Could not find the connection");
        const bkp = await this.dbs.backups.insert({
            created: new Date(),
            dbSizeInBytes: await this.getDBSizeInBytes(conId),
            sizeInBytes: sizeBytes.toString(),
            initiator: "manual_restore_from_file: " + fileName,
            connection_id: con.id,
            credential_id: null,
            destination: "None (temp stream)",
            dump_command: "pg_dump --format=c --clean --if-exists",
            options: {
                command: "pg_dump",
                clean: true,
                format: "c",
            },
            status: { loading: { total: sizeBytes, loaded: 0 } }
        }, { returning: "*" });
        let lastChunk = Date.now();
        let chunkSum = 0;
        stream.on("data", chunk => {
            chunkSum += chunk.length;
            if (Date.now() - lastChunk > 1000) {
                lastChunk = Date.now();
                this.dbs.backups.update({ id: bkp.id }, { restore_status: { loading: { total: sizeBytes, loaded: chunkSum } } });
            }
        });
        return this.pgRestore({ bkpId: bkp.id }, stream, restore_options);
    };
    bkpDelete = async (bkpId, force = false) => {
        const { fileMgr, bkp } = await (0, utils_1.getBkp)(this.dbs, bkpId);
        try {
            await fileMgr.deleteFile(bkp.id);
        }
        catch (err) {
            if (!force)
                throw err;
        }
        await this.dbs.backups.delete({ id: bkp.id });
        return bkp.id;
    };
    onRequestBackupFile = async (res, userData, req) => {
        if (userData?.user.type !== "admin") {
            res.sendStatus(401);
        }
        else {
            const bkpId = req.path.slice(exports.BKP_PREFFIX.length + 1);
            if (!bkpId) {
                res.sendStatus(404);
            }
            else {
                const bkp = await this.dbs.backups.findOne({ id: bkpId });
                if (!bkp) {
                    res.sendStatus(404);
                }
                else {
                    const { fileMgr } = await (0, utils_1.getFileMgr)(this.dbs, bkp.credential_id);
                    if (bkp.credential_id) {
                        /* Allow access to file for a period equivalent to a download rate of 50KBps */
                        const presignedURL = await fileMgr.getFileCloudDownloadURL(bkp.id, +(bkp.sizeInBytes ?? 1e6) / 50);
                        if (!presignedURL) {
                            res.sendStatus(404);
                        }
                        else {
                            res.redirect(presignedURL);
                        }
                    }
                    else {
                        try {
                            res.type(bkp.content_type);
                            res.sendFile(path_1.default.resolve(path_1.default.join((0, electronConfig_1.getRootDir)() + exports.BKP_PREFFIX + "/" + bkp.id)));
                        }
                        catch (err) {
                            res.sendStatus(404);
                        }
                    }
                }
            }
        }
    };
    timeout;
    closeStream = (streamId) => {
        const s = this.tempStreams[streamId];
        if (!s)
            throw new Error("Stream not found");
        return s.stream;
    };
    pushToStream = (streamId, chunk, cb) => {
        const s = this.tempStreams[streamId];
        if (!s)
            throw new Error("Stream not found");
        if (this.timeout)
            clearTimeout(this.timeout);
        /** Delete stale streams */
        this.timeout = setTimeout(() => {
            Object.keys(this.tempStreams).forEach(key => {
                const v = this.tempStreams[key];
                if (v && (Date.now() - v.lastChunk > 60 * 1000)) {
                    v.stream.destroy();
                    delete this.tempStreams[key];
                }
            });
        }, 60 * 1000);
        s.lastChunk = Date.now();
        s.stream.write(chunk, cb);
    };
    getTempFileStream = (fileName, userId) => {
        // const filePath = localFolderPath + "/temp/" + fileName;
        // const writeStream = fs.createWriteStream(filePath);
        const stream = new stream_1.PassThrough();
        const streamId = `${userId}-${fileName}`;
        this.tempStreams[streamId] = {
            lastChunk: Date.now(),
            stream
        };
        stream.on("error", err => {
            console.error(err);
            stream.end();
            if (this.tempStreams[streamId]) {
                delete this.tempStreams[streamId];
            }
        });
        return {
            streamId,
            stream
        };
    };
    getCurrentBackup = (conId) => this.dbs.backups.findOne({
        connection_id: conId,
        "status->loading.<>": null,
        /* If not updated in last 5 minutes then consider it dead */
        // last_updated: { ">": new Date(Date.now() - HOUR/12)  }
        $filter: [{ $ageNow: ["last_updated"] }, "<", "2 seconds"]
    });
    checkAutomaticBackup = checkAutomaticBackup_1.checkAutomaticBackup.bind(this);
}
exports.default = BackupManager;
//# sourceMappingURL=BackupManager.js.map