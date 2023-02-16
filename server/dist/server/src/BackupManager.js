"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipeToCommand = exports.pipeFromCommand = exports.getFileMgr = exports.BKP_PREFFIX = exports.BACKUP_FOLDERNAME = void 0;
const path_1 = __importDefault(require("path"));
const child_process_1 = __importDefault(require("child_process"));
const stream_1 = require("stream");
const prostgles_types_1 = require("prostgles-types");
const FileManager_1 = __importDefault(require("prostgles-server/dist/FileManager"));
const prostgles_types_2 = require("prostgles-types");
const utils_1 = require("../../commonTypes/utils");
exports.BACKUP_FOLDERNAME = "prostgles_backups";
exports.BKP_PREFFIX = "/" + exports.BACKUP_FOLDERNAME;
const getConnectionUri = (c) => c.db_conn || `postgres://${c.db_user}:${c.db_pass || ""}@${c.db_host || "localhost"}:${c.db_port || "5432"}/${c.db_name}`;
const check_disk_space_1 = __importDefault(require("check-disk-space"));
const electronConfig_1 = require("./electronConfig");
const getConnectionDetails_1 = require("./connectionUtils/getConnectionDetails");
const PubSubManager_1 = require("prostgles-server/dist/PubSubManager/PubSubManager");
const HOUR = 3600 * 1000;
class BackupManager {
    tempStreams = {};
    commandDirectoryPrefix;
    commandExt;
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
                if (Date.now() - this.tempStreams[key].lastChunk > 60 * 1000) {
                    this.tempStreams[key].stream.destroy();
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
    checkAutomaticBackup = async (con) => {
        const AUTO_INITIATOR = "automatic_backups";
        // const bkpConf: BackupsConfig = con.backups_config;
        const bkpConf = con.backups_config;
        if (!bkpConf?.dump_options)
            return;
        const bkpFilter = { connection_id: con.id, initiator: AUTO_INITIATOR };
        const dump = async () => {
            const lastBackup = await this.dbs.backups.findOne(bkpFilter, { orderBy: { created: -1 } });
            if (bkpConf?.err)
                await this.dbs.connections.update({ id: con.id }, { backups_config: { ...bkpConf, err: null } });
            if (bkpConf?.frequency) {
                const hourIsOK = () => {
                    if (Number.isInteger(bkpConf.hour)) {
                        if (now.getHours() >= bkpConf.hour) {
                            return true;
                        }
                    }
                    else {
                        return true;
                    }
                    return false;
                };
                const dowIsOK = () => {
                    if (Number.isInteger(bkpConf.dayOfWeek)) {
                        if ((now.getDay() || 7) >= bkpConf.dayOfWeek) {
                            return true;
                        }
                    }
                    else {
                        return true;
                    }
                    return false;
                };
                const dateIsOK = () => {
                    const date = new Date();
                    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                    if (bkpConf.dayOfMonth && Number.isInteger(bkpConf.dayOfMonth)) {
                        if (now.getDate() >= bkpConf.dayOfMonth || bkpConf.dayOfMonth > lastDay.getDate() && now.getDate() === lastDay.getDate()) {
                            return true;
                        }
                    }
                    else {
                        return true;
                    }
                    return false;
                };
                let shouldDump = false;
                const now = new Date();
                const currentBackup = await this.getCurrentBackup(con.id);
                if (currentBackup) {
                    shouldDump = false;
                }
                else if (bkpConf.frequency === "hourly" && (!lastBackup || lastBackup.created < new Date(Date.now() - HOUR))) {
                    shouldDump = true;
                }
                else if (hourIsOK() && bkpConf.frequency === "daily" && (!lastBackup || lastBackup.created < new Date(Date.now() - 24 * HOUR))) {
                    shouldDump = true;
                }
                else if (dowIsOK() && hourIsOK() && bkpConf.frequency === "weekly" && (!lastBackup || lastBackup.created < new Date(Date.now() - 7 * 24 * HOUR))) {
                    shouldDump = true;
                }
                else if (dateIsOK() && dowIsOK() && hourIsOK() && bkpConf.frequency === "monthly" && (!lastBackup || lastBackup.created < new Date(Date.now() - 28 * 24 * HOUR))) {
                    shouldDump = true;
                }
                if (shouldDump) {
                    await this.pgDump(con.id, null, { options: { ...bkpConf.dump_options }, destination: bkpConf.cloudConfig ? "Cloud" : "Local", credentialID: bkpConf.cloudConfig?.credential_id, initiator: AUTO_INITIATOR });
                    if (bkpConf.keepLast && bkpConf.keepLast > 0) {
                        const toKeepIds = (await this.dbs.backups.find(bkpFilter, { select: { id: 1 }, orderBy: { created: -1 }, limit: bkpConf.keepLast })).map(c => c.id);
                        await this.dbs.backups.delete({ "id.$nin": toKeepIds, ...bkpFilter });
                    }
                }
            }
        };
        /** Local backup, check if enough space */
        if (!bkpConf?.cloudConfig?.credential_id) {
            const space = await this.checkIfEnoughSpace(con.id);
            if (space.err) {
                if (bkpConf?.err !== space.err) {
                    await this.dbs.connections.update({ id: con.id }, { backups_config: { ...bkpConf, err: space.err } });
                }
            }
            else {
                await dump();
            }
        }
        else {
            await dump();
        }
    };
    dbs;
    interval;
    connMgr;
    constructor(dbs, connMgr, windows) {
        this.dbs = dbs;
        this.connMgr = connMgr;
        this.commandDirectoryPrefix = windows.preffix;
        this.commandExt = windows.extension;
        const checkAutomaticBkps = async () => {
            const connections = await this.dbs.connections.find({ "backups_config->>enabled": 'true' });
            for await (const con of connections) {
                await this.checkAutomaticBackup(con);
            }
            connections.forEach(con => {
                this.checkAutomaticBackup(con);
            });
        };
        this.interval = setInterval(checkAutomaticBkps, HOUR / 4);
        checkAutomaticBkps();
        // }, 5000)
    }
    async destroy() {
        clearInterval(this.interval);
    }
    checkIfEnoughSpace = async (conId) => {
        const dbSizeInBytes = await this.getDBSizeInBytes(conId);
        const diskSpace = await (0, check_disk_space_1.default)((0, electronConfig_1.getRootDir)());
        const minLimin = 100 * 1e6;
        if (diskSpace.free < minLimin) {
            const err = `There is not enough space on server for local backups:\nTotal: ${bytesToSize(diskSpace.size)} \nRemaning: ${bytesToSize(diskSpace.free)} \nRequired: ${bytesToSize(minLimin)}`;
            return { ok: false, err, diskSpace, dbSizeInBytes };
        }
        else if (diskSpace.free - (1.1 * dbSizeInBytes) < 0) {
            const err = `There is not enough space on server for local backups:\nTotal: ${bytesToSize(diskSpace.size)} \nRemaning: ${bytesToSize(diskSpace.free)} \nRequired: 1.1*DB size on disk (${bytesToSize(dbSizeInBytes)})`;
            return { ok: false, err, diskSpace, dbSizeInBytes };
        }
        else {
            return { ok: true, diskSpace, dbSizeInBytes };
        }
    };
    getDBSizeInBytes = async (conId) => {
        const db = this.connMgr.getConnection(conId);
        const result = (await db?.prgl?.db?.sql?.("SELECT pg_database_size(current_database())  ", {}, { returnType: "value" }));
        return Number.isFinite(+result) ? result : 0;
    };
    pgDump = async (conId, credId, { options: o, destination, credentialID, initiator = "manual_backup" }) => {
        const con = await this.dbs.connections.findOne({ id: conId });
        if (!con)
            throw new Error("Could not find the connection");
        const setError = (err) => {
            console.error(new Date() + " pg_dump err for connection " + conId, err);
            if (backup_id) {
                this.dbs.backups.update({ id: backup_id }, { status: { err }, last_updated: new Date() });
            }
            else {
                throw err;
            }
        };
        const { fileMgr } = await getFileMgr(this.dbs, credId);
        if (!credId) {
            const space = await this.checkIfEnoughSpace(conId);
            if (space.err)
                throw space.err;
        }
        const currentBackup = await this.getCurrentBackup(con.id);
        if (currentBackup) {
            throw "Cannot backup while another backup is in progress";
        }
        const SSL_ENV_VARS = getSSLEnvVars(con, this.connMgr);
        let backup_id;
        const uri = getConnectionUri(con);
        const ConnectionEnvVars = getConnectionEnvVars(con);
        const ENV_VARS = { ...SSL_ENV_VARS, ...ConnectionEnvVars };
        const dumpAll = o.command === "pg_dumpall";
        const dumpCommand = dumpAll ? {
            command: this.commandDirectoryPrefix + "pg_dumpall" + this.commandExt,
            opts: addOptions(["-d", uri], [
                [o.clean, "--clean"],
                [o.ifExists, "--if-exists"],
                [o.globalsOnly, "--globals-only"],
                [o.rolesOnly, "--roles-only"],
                [o.dataOnly, "--data-only"],
                [o.schemaOnly, "--schema-only"],
                [!!o.encoding, ["--encoding", o.encoding]],
                [true, "-v"]
            ])
        } : {
            command: this.commandDirectoryPrefix + "pg_dump" + this.commandExt,
            // opts: addOptions([uri_NOT_SAFE_-> VISIBLE TO ps aux], [
            opts: addOptions([], [
                [!!o.format, ["--format", o.format]],
                [o.clean, "--clean"],
                [o.create, "--create"],
                [o.noOwner, "--no-owner"],
                [o.ifExists, "--if-exists"],
                [o.dataOnly, "--data-only"],
                [!!o.encoding, ["--encoding", o.encoding]],
                [Number.isInteger(o.compressionLevel), ["--compress", o.compressionLevel]],
                [Number.isInteger(o.numberOfJobs), ["--jobs", o.numberOfJobs]],
                [true, "-v"]
            ])
        };
        try {
            const content_type = (dumpAll || o.format === "p") ? "text/sql" : "application/gzip";
            const backup = await this.dbs.backups.insert({
                created: new Date(),
                dbSizeInBytes: await this.getDBSizeInBytes(conId),
                initiator,
                connection_id: con.id,
                credential_id: credId ?? null,
                destination: credId ? "Cloud" : "Local",
                dump_command: envToStr(ENV_VARS) + dumpCommand.command + " " + dumpCommand.opts.join(" "),
                status: { loading: { loaded: 0, total: 0 } },
                options: (0, PubSubManager_1.omitKeys)(o, ["credentialID"]),
                content_type,
            }, { returning: "*" });
            const bkpForId = await this.dbs.backups.findOne({ id: backup.id }, { select: { created: "$datetime_" } });
            if (!bkpForId)
                throw "Internal error";
            backup_id = `${(con.db_name || "").replace(/[\W]+/g, "_")}__${bkpForId.created}_pg_dump${dumpAll ? "all" : ""}_${backup.id}.${content_type === "text/sql" ? "sql" : "dump"}`;
            await this.dbs.backups.update({ id: backup.id }, { id: backup_id });
            const getBkp = () => this.dbs.backups.findOne({ id: backup_id });
            const destStream = fileMgr.uploadStream(backup_id, content_type, async (loading) => {
                // const bkp = await getBkp();
                // if(!bkp || "err" in bkp.status && bkp.status.err){
                this.dbs.backups.update({ $and: [{ id: backup_id }, { "status->>ok": null }, { "status->>err": null }] }, { status: { loading }, last_updated: new Date() });
                // }
            }, setError, async (item) => {
                const bkp = await getBkp();
                if (bkp && "err" in bkp?.status) {
                    try {
                        await fileMgr.deleteFile(bkp.id);
                    }
                    catch (err) {
                    }
                }
                else {
                    this.dbs.backups.update({ id: backup_id }, {
                        sizeInBytes: item.content_length,
                        uploaded: new Date(),
                        status: { ok: "1" },
                        last_updated: new Date(),
                        local_filepath: item.filePath,
                    });
                }
            });
            // const res = child.spawnSync(dumpCommand.command, dumpCommand.opts.concat(["-f", "-l"]) as any, { env: ENV_VARS });
            /** Will not show pg_dump TOC list progress because generating a TOC list takes as long as the actual pg_dump in some cases */
            const proc = pipeFromCommand({
                ...dumpCommand,
                envVars: ENV_VARS,
                destination: destStream,
                onEnd: err => {
                    if (err) {
                        setError(err);
                    }
                },
                onStdout: !o.keepLogs ? undefined : async ({ chunk: _dump_logs, pipedLength }, isStdErr) => {
                    if (!isStdErr)
                        return;
                    const currBkp = await this.dbs.backups.findOne({ id: backup_id });
                    if (!currBkp) {
                        proc.kill();
                        return;
                    }
                    const dump_logs = makeLogs(_dump_logs, currBkp?.dump_logs, currBkp?.created);
                    this.dbs.backups.update({ id: backup_id, "status->>ok": null }, {
                        dump_logs,
                        last_updated: new Date()
                    });
                },
                useExec: false
            });
            let interval = setInterval(async () => {
                const bkp = await this.dbs.backups.findOne({ id: backup_id });
                if (!bkp || bkp && "err" in bkp.status) {
                    destStream.end();
                    clearInterval(interval);
                }
                else if (bkp.uploaded) {
                    clearInterval(interval);
                }
            }, 2000);
            return backup_id;
        }
        catch (err) {
            setError(err);
        }
    };
    pgRestore = async (arg1, stream, o) => {
        const { bkpId, connId } = arg1;
        const { fileMgr, bkp } = await getBkp(this.dbs, bkpId);
        if (!bkp.id && !connId)
            throw "Must provide a connection id if backup does not have a connection_id";
        const connection_id = connId ?? bkp.connection_id;
        const con = await this.dbs.connections.findOne({ id: connection_id });
        if (!con)
            throw "Connection not found";
        if (!o)
            throw "Restore options missing";
        const setError = async (err) => {
            const currBkp = await this.dbs.backups.findOne({ id: bkpId });
            if (currBkp) {
                this.dbs.backups.update({ id: bkpId }, {
                    restore_status: {
                        ...(0, PubSubManager_1.omitKeys)(currBkp.restore_status, ["ok"]),
                        err: (err ?? "").toString()
                    },
                    last_updated: new Date()
                });
            }
        };
        if (o.newDbName) {
            if (o.create)
                throw "Cannot use 'newDbName' together with 'create'. --create option will still restore into the database specified within the dump file";
            try {
                if (!this.dbs.sql)
                    throw new Error("db.sql not allowed");
                await this.dbs.sql(`CREATE DATABASE ${(0, prostgles_types_1.asName)(o.newDbName)}`);
            }
            catch (err) {
                setError(err);
            }
        }
        const isWin = process.platform === "win32";
        const byBassStreamDueToWindowsUnrecognisedBlockTypeError = !!(isWin && bkp.local_filepath);
        if (byBassStreamDueToWindowsUnrecognisedBlockTypeError && !bkp.local_filepath) {
            throw "Cannot restore from cloud on Windows through the Desktop version";
        }
        try {
            const SSL_ENV_VARS = getSSLEnvVars(con, this.connMgr);
            const ConnectionEnvVars = getConnectionEnvVars(con);
            const ENV_VARS = { ...SSL_ENV_VARS, ...ConnectionEnvVars };
            const bkpStream = stream ?? await fileMgr.getFileStream(bkp.id);
            const restoreCmd = (o.command === "psql" || o.format === "p") ? {
                command: this.commandDirectoryPrefix + "psql" + this.commandExt,
                // opts: [getConnectionUri(con as any)] // NOT SAFE ps aux
                opts: []
            } : {
                command: this.commandDirectoryPrefix + "pg_restore" + this.commandExt,
                opts: addOptions(
                // ["-d", getConnectionUri(con as any) NOT SAFE FROM ps aux], 
                [], [
                    [true, "--dbname=" + ConnectionEnvVars.PGDATABASE],
                    [true, "-w"],
                    [o.clean, "--clean"],
                    [o.create, "--create"],
                    [o.noOwner, "--no-owner"],
                    [!!o.format, ["--format", o.format]],
                    [o.dataOnly, "--data-only"],
                    [o.ifExists, "--if-exists"],
                    [Number.isInteger(o.numberOfJobs), "--jobs"],
                    [true, "-v"],
                    [byBassStreamDueToWindowsUnrecognisedBlockTypeError, bkp.local_filepath],
                ])
            };
            await this.dbs.backups.update({ id: bkpId }, {
                restore_logs: "",
                restore_start: new Date(),
                restore_command: envToStr(ENV_VARS) + restoreCmd.command + " " + restoreCmd.opts.join(" "),
                restore_status: { loading: { loaded: 0, total: 0 } },
                last_updated: new Date()
            });
            let lastChunk = Date.now(), chunkSum = 0;
            bkpStream.on("data", async (chunk) => {
                chunkSum += chunk.length;
                // console.log(chunk.toString(), { chunk })
                const now = Date.now();
                if (now - lastChunk > 1000) {
                    lastChunk = now;
                    if (!(await this.dbs.backups.findOne({ id: bkpId }))) {
                        bkpStream.emit("error", "Backup file not found");
                    }
                    else {
                        this.dbs.backups.update({ id: bkpId }, {
                            restore_status: {
                                loading: {
                                    loaded: chunkSum,
                                    total: +(bkp.sizeInBytes ?? bkp.dbSizeInBytes ?? 0)
                                }
                            }
                        });
                    }
                }
            });
            const proc = pipeToCommand(restoreCmd.command, restoreCmd.opts, ENV_VARS, bkpStream, err => {
                if (err) {
                    console.error("pipeToCommand ERR:", err);
                    bkpStream.destroy();
                    setError(err);
                }
                else {
                    this.dbs.backups.update({ id: bkpId }, { restore_end: new Date(), restore_status: { ok: `${new Date()}` }, last_updated: new Date() });
                }
            }, async ({ chunk: _restore_logs }, isStdErr) => {
                /** Full logs are always provided */
                if (!isStdErr)
                    return;
                const currBkp = await this.dbs.backups.findOne({ id: bkpId });
                if (currBkp?.restore_status.err) {
                    proc.kill();
                    return;
                }
                if (!currBkp) {
                    bkpStream.emit("error", "Backup file not found");
                    bkpStream.destroy();
                }
                else {
                    const restore_logs = makeLogs(_restore_logs, currBkp.restore_logs, currBkp.restore_start); // currBkp.restore_logs
                    this.dbs.backups.update({ id: bkpId }, { restore_end: new Date(), restore_logs, last_updated: new Date() });
                }
            }, false);
        }
        catch (err) {
            setError(err);
        }
    };
    pgRestoreStream = async (fileName, conId, stream, sizeBytes, restore_options) => {
        const con = await this.dbs.connections.findOne({ id: conId });
        if (!con)
            throw new Error("Could not find the connection");
        const bkp = await this.dbs.backups.insert({
            created: new Date(),
            dbSizeInBytes: await this.getDBSizeInBytes(conId),
            sizeInBytes: sizeBytes,
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
        const { fileMgr, bkp } = await getBkp(this.dbs, bkpId);
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
        if (userData?.user?.type !== "admin") {
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
                    const { fileMgr } = await getFileMgr(this.dbs, bkp.credential_id);
                    if (bkp.credential_id) {
                        /* Allow access to file for a period equivalent to a download rate of 50KBps */
                        const presignedURL = await fileMgr.getFileS3URL(bkp.id, (bkp.sizeInBytes ?? 1e6) / 50);
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
}
exports.default = BackupManager;
async function getFileMgr(dbs, credId) {
    const localFolderPath = path_1.default.resolve((0, electronConfig_1.getRootDir)() + '/' + exports.BACKUP_FOLDERNAME);
    let cred;
    if (credId) {
        cred = await dbs.credentials.findOne({ id: credId, type: "s3" });
        if (!cred)
            throw new Error("Could not find the credentials");
    }
    const fileMgr = new FileManager_1.default(cred ? { accessKeyId: cred.key_id, secretAccessKey: cred.key_secret, bucket: cred.bucket, region: cred.region } : { localFolderPath });
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
function envToStr(vars) {
    return (0, prostgles_types_2.getKeys)(vars).map(k => `${k}=${JSON.stringify(vars[k])}`).join(" ") + " ";
}
function pipeFromCommand(args) {
    const { useExec = false, envVars = {}, onEnd, command, destination, opts, onStdout, onChunk } = args;
    const execCommand = `${envToStr(envVars)} ${command} ${opts.join(" ")}`;
    const env = !envVars ? undefined : envVars;
    const proc = useExec ? child_process_1.default.exec(execCommand) : child_process_1.default.spawn(command, opts, { env });
    const getUTFText = (v) => v.toString(); //.replaceAll(/[^\x00-\x7F]/g, ""); //.replaceAll("\\", "[escaped backslash]");   // .replaceAll("\\u0000", "");
    let fullLog = "";
    const lastSent = Date.now();
    let log;
    let streamSize = 0;
    proc.stderr.on('data', (data) => {
        log = getUTFText(data);
        fullLog += log;
        // const now = Date.now();
        // if(lastSent > now - 1000){
        /** These are the pg_dump logs */
        onStdout?.({ full: fullLog, chunk: log, pipedLength: streamSize }, true);
        // }
    });
    proc.stdout.on('data', (data) => {
        streamSize += data.length;
        /** These is the pg_dump actual data */
        onChunk?.(data, streamSize);
        // onStdout?.({ chunk: getUTFText(data), full: fullLog });
    });
    proc.stdout.on('error', function (err) {
        onEnd(err ?? "proc.stdout 'error'", fullLog);
    });
    proc.stdin.on('error', function (err) {
        onEnd(err ?? "proc.stdin 'error'", fullLog);
    });
    proc.on('error', function (err) {
        onEnd(err ?? "proc 'error'", fullLog);
    });
    proc.stdout.pipe(destination, { end: false });
    proc.on('exit', function (code, signal) {
        if (code) {
            console.error({ execCommandErr: fullLog.slice(fullLog.length - 100) });
            onEnd(log ?? "Error", fullLog);
        }
        else {
            onEnd(undefined, fullLog);
            destination.end();
        }
    });
    return proc;
}
exports.pipeFromCommand = pipeFromCommand;
function pipeToCommand(command, opts, envVars = {}, source, onEnd, onStdout, useExec = false) {
    const execCommand = `${envToStr(envVars)} ${command} ${opts.join(" ")}`;
    const env = !envVars ? undefined : envVars;
    const proc = useExec ? child_process_1.default.exec(execCommand) : child_process_1.default.spawn(command, opts, { env });
    let log;
    let fullLog = "";
    proc.stderr.on('data', (data) => {
        log = data.toString();
        fullLog += log;
        onStdout?.({ full: fullLog, chunk: log }, true);
    });
    proc.stdout.on('data', (data) => {
        const log = data.toString();
        fullLog += log;
        onStdout?.({ full: fullLog, chunk: log });
    });
    proc.stdout.on('error', function (err) {
        onEnd(err ?? "proc.stdout 'error'");
    });
    proc.stdin.on('error', function (err) {
        onEnd(err ?? "proc.stdin 'error'");
    });
    proc.on('error', function (err) {
        onEnd(err ?? "proc 'error'");
    });
    source.pipe(proc.stdin);
    proc.on('exit', function (code, signal) {
        const err = fullLog.split("\n").at(-1);
        if (code) {
            console.error({ execCommandErr: err });
            source.destroy();
        }
        onEnd?.(code ? (err ?? "Error") : undefined);
    });
    return proc;
}
exports.pipeToCommand = pipeToCommand;
function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0)
        return '0 Byte';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)) + "");
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
}
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
function addOptions(opts, extra) {
    return opts.concat(extra.filter(e => e[0]).flatMap(e => e[1]).map(e => e.toString()));
}
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
const makeLogs = (newLogs, oldLogs, startTime) => {
    let restore_logs = newLogs;
    if (startTime) {
        const age = (0, utils_1.getAge)(+startTime, Date.now(), true);
        const padd2 = (v) => v.toFixed(0).toString().padStart(2, "0");
        restore_logs = newLogs.split("\n").filter(v => v).map(v => v.includes("T+") ? v : `T+ ${[age.hours, age.minutes, age.seconds].map(padd2).join(":")}   ${v}`).join("\n");
    }
    return (oldLogs || "") + "\n" + restore_logs;
};
//# sourceMappingURL=BackupManager.js.map