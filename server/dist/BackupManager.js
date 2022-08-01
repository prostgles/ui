"use strict";
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipeToCommand = exports.pipeFromCommand = exports.getFileMgr = exports.BACKUP_FOLDERNAME = void 0;
// @ts-nocheckd
const index_1 = require("./index");
const path_1 = __importDefault(require("path"));
const child_process_1 = __importDefault(require("child_process"));
const stream_1 = require("stream");
const prostgles_types_1 = require("prostgles-types");
const FileManager_1 = __importDefault(require("prostgles-server/dist/FileManager"));
const getConnectionUri = (c) => c.db_conn || `postgres://${c.db_user}:${c.db_pass || ""}@${c.db_host || "localhost"}:${c.db_port || "5432"}/${c.db_name}`;
const check_disk_space_1 = __importDefault(require("check-disk-space"));
const HOUR = 3600 * 1000;
const FREQ_MAP = {
    daily: HOUR * 24,
    "monthly": HOUR * 24 * 30,
    "weekly": HOUR * 24 * 7,
    "hourly": HOUR
};
class BackupManager {
    constructor(dbs) {
        this.tempStreams = {};
        this.closeStream = (streamId) => {
            const s = this.tempStreams[streamId];
            if (!s)
                throw new Error("Stream not found");
            return s.stream;
        };
        this.pushToStream = (streamId, chunk, cb) => {
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
        this.getTempFileStream = (fileName, userId) => {
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
        this.getCurrentBackup = (conId) => this.dbs.backups.findOne({
            connection_id: conId,
            "status->loading.<>": null,
            /* If not updated in last 5 minutes then consider it dead */
            // last_updated: { ">": new Date(Date.now() - HOUR/12)  }
            $filter: [{ $ageNow: ["last_updated"] }, "<", "2 seconds"]
        });
        this.checkIfEnoughSpace = async (conId) => {
            const dbSizeInBytes = await this.getDBSizeInBytes(conId);
            const diskSpace = await (0, check_disk_space_1.default)('/');
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
        this.getDBSizeInBytes = async (conId) => {
            var _a, _b, _c;
            const db = index_1.connMgr.getConnection(conId);
            const result = (await ((_c = (_b = (_a = db === null || db === void 0 ? void 0 : db.prgl) === null || _a === void 0 ? void 0 : _a.db) === null || _b === void 0 ? void 0 : _b.sql) === null || _c === void 0 ? void 0 : _c.call(_b, "SELECT pg_database_size(current_database())  ", {}, { returnType: "value" })));
            return Number.isFinite(+result) ? result : 0;
        };
        this.pgDump = async (conId, credId, dumpOpts) => {
            const { command, format = "c", clean = true, initiator = "manual_backup", ifExists } = dumpOpts || {};
            const dumpAll = command === "pg_dumpall";
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
            let backup_id;
            const uri = getConnectionUri(con);
            const dumpCommand = dumpAll ? {
                command: getSSLEnvVars(con),
                opts: ["pg_dumpall", "-d", uri]
                    .concat(clean ? ["--clean"] : [])
                    .concat(ifExists ? ["--if-exists"] : [])
                    .concat(["-v"])
            } : {
                command: getSSLEnvVars(con),
                opts: ["pg_dump", uri]
                    .concat(clean ? ["--clean"] : [])
                    .concat(format ? ["--format", format] : []) // Will be validated on update
                    .concat(ifExists ? ["--if-exists"] : [])
                    // .concat(create? ["--create"] : [])
                    // .concat(noOwner? ["--no-owner"] : [])
                    // .concat(dataOnly? ["--data-only"] : [])
                    .concat(["-v"])
            };
            try {
                const content_type = (format === "p" || dumpAll) ? "text/sql" : "application/gzip";
                const backup = await this.dbs.backups.insert({
                    created: new Date(),
                    dbSizeInBytes: await this.getDBSizeInBytes(conId),
                    initiator,
                    connection_id: con.id,
                    credential_id: credId !== null && credId !== void 0 ? credId : null,
                    destination: credId ? "Cloud" : "Local",
                    dump_command: dumpCommand.command + " " + dumpCommand.opts.join(" "),
                    status: { loading: { loaded: 0, total: 0 } },
                    options: dumpOpts,
                    content_type,
                }, { returning: "*" });
                const bkpForId = await this.dbs.backups.findOne({ id: backup.id }, { select: { created: "$datetime_" } });
                if (!bkpForId)
                    throw "Internal error";
                backup_id = `${con.db_name}__${bkpForId.created}_pg_dump${dumpAll ? "all" : ""}_${backup.id}.${content_type === "text/sql" ? "sql" : "gzip"}`;
                await this.dbs.backups.update({ id: backup.id }, { id: backup_id });
                const getBkp = () => this.dbs.backups.findOne({ id: backup_id });
                const destStream = fileMgr.uploadStream(backup_id, content_type, async (loading) => {
                    const bkp = await getBkp();
                    if (!bkp || "err" in bkp.status && bkp.status.err) {
                        this.dbs.backups.update({ id: backup_id }, { status: { loading }, last_updated: new Date() });
                    }
                }, setError, async (item) => {
                    const bkp = await getBkp();
                    if (bkp && "err" in (bkp === null || bkp === void 0 ? void 0 : bkp.status)) {
                        try {
                            await fileMgr.deleteFile(bkp.id);
                        }
                        catch (err) {
                        }
                    }
                    else {
                        this.dbs.backups.update({ id: backup_id }, { sizeInBytes: item.content_length, uploaded: new Date(), status: { ok: "1" }, last_updated: new Date() });
                    }
                });
                pipeFromCommand(dumpCommand.command, dumpCommand.opts, destStream, err => {
                    if (err) {
                        setError(err);
                    }
                }, !dumpOpts.keepLogs ? undefined : (dump_logs, isStdErr) => {
                    if (!isStdErr)
                        return;
                    this.dbs.backups.update({ id: backup_id, "status->>ok": null }, { dump_logs, last_updated: new Date() });
                }, true);
                let interval = setInterval(async () => {
                    const bkp = await this.dbs.backups.findOne({ id: backup_id });
                    if (!bkp || bkp && "err" in bkp.status) {
                        destStream.end();
                        // destStream.pause();
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
        this.pgRestore = async (bkpId, stream, restore_options) => {
            const { newDbName, clean, create, command, format, dataOnly, ifExists, noOwner } = restore_options;
            const { fileMgr, bkp } = await getBkp(this.dbs, bkpId);
            const con = await this.dbs.connections.findOne({ id: bkp.connection_id });
            if (!con)
                throw "Connection not found";
            const setError = (err) => {
                this.dbs.backups.update({ id: bkpId }, { restore_status: { err: (err !== null && err !== void 0 ? err : "").toString() }, last_updated: new Date() });
            };
            if (newDbName) {
                try {
                    if (!this.dbs.sql)
                        throw new Error("db.sql not allowed");
                    await this.dbs.sql(`CREATE DATABASE ${(0, prostgles_types_1.asName)(newDbName)}`);
                }
                catch (err) {
                    setError(err);
                }
            }
            try {
                const bkpStream = stream !== null && stream !== void 0 ? stream : await fileMgr.getFileStream(bkp.id);
                const restoreCmd = (command === "psql" || format === "p") ? {
                    command: getSSLEnvVars(con),
                    opts: ["psql", getConnectionUri(con)]
                } : {
                    command: getSSLEnvVars(con),
                    opts: ["pg_restore", "-d", getConnectionUri(con)]
                        .concat(clean ? ["--clean"] : [])
                        .concat(create ? ["--create"] : [])
                        .concat(format ? ["--format", format] : []) // Will be validated on update
                        .concat(dataOnly ? ["--data-only"] : [])
                        .concat(ifExists ? ["--if-exists"] : [])
                        .concat(noOwner ? ["--no-owner"] : [])
                        .concat(["-v"])
                };
                await this.dbs.backups.update({ id: bkpId }, {
                    restore_start: new Date(),
                    restore_command: restoreCmd.command + " " + restoreCmd.opts.join(" "),
                    restore_status: { loading: { loaded: 0, total: 0 } },
                    last_updated: new Date()
                });
                let lastChunk = Date.now(), chunkSum = 0;
                bkpStream.on("data", async (chunk) => {
                    chunkSum += chunk.length;
                    const now = Date.now();
                    if (now - lastChunk > 1000) {
                        lastChunk = now;
                        if (!(await this.dbs.backups.findOne({ id: bkpId }))) {
                            bkpStream.emit("error", "Backup file not found");
                        }
                        else {
                            this.dbs.backups.update({ id: bkpId }, { restore_status: { loading: { loaded: chunkSum, total: 0 } } });
                        }
                    }
                });
                pipeToCommand(restoreCmd.command, restoreCmd.opts, bkpStream, err => {
                    if (err) {
                        console.error("pipeToCommand ERR:", err);
                        bkpStream.destroy();
                        setError(err);
                    }
                    else {
                        this.dbs.backups.update({ id: bkpId }, { restore_end: new Date(), restore_status: { ok: `${new Date()}` }, last_updated: new Date() });
                    }
                }, async (restore_logs, isStdErr) => {
                    if (!isStdErr)
                        return;
                    if (!(await this.dbs.backups.findOne({ id: bkpId }))) {
                        bkpStream.emit("error", "Backup file not found");
                        bkpStream.destroy();
                    }
                    else {
                        this.dbs.backups.update({ id: bkpId }, { restore_end: new Date(), restore_logs, last_updated: new Date() });
                    }
                }, true);
            }
            catch (err) {
                setError(err);
            }
        };
        this.pgRestoreStream = async (fileName, conId, stream, sizeBytes, restore_options) => {
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
            return this.pgRestore(bkp.id, stream, restore_options);
        };
        this.bkpDelete = async (bkpId, force = false) => {
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
        this.dbs = dbs;
        this.interval = setInterval(async () => {
            var e_1, _a;
            var _b;
            const connections = await this.dbs.connections.find({ "backups_config->>enabled": 'true' });
            try {
                for (var connections_1 = __asyncValues(connections), connections_1_1; connections_1_1 = await connections_1.next(), !connections_1_1.done;) {
                    const con = connections_1_1.value;
                    const AUTO_INITIATOR = "automatic_backups";
                    const bkpConf = con.backups_config;
                    if (!(bkpConf === null || bkpConf === void 0 ? void 0 : bkpConf.options))
                        return;
                    const bkpFilter = { connection_id: con.id, initiator: AUTO_INITIATOR };
                    const dump = async () => {
                        const lastBackup = await this.dbs.backups.findOne(bkpFilter, { orderBy: { created: -1 } });
                        if (bkpConf === null || bkpConf === void 0 ? void 0 : bkpConf.err)
                            await this.dbs.connections.update({ id: con.id }, { backups_config: Object.assign(Object.assign({}, bkpConf), { err: null }) });
                        if (bkpConf === null || bkpConf === void 0 ? void 0 : bkpConf.frequency) {
                            const hourIsOK = () => {
                                if (Number.isInteger(bkpConf.hour)) {
                                    if (now.getHours() === bkpConf.hour) {
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
                                    if ((now.getDay() || 7) === bkpConf.dayOfWeek) {
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
                                // const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
                                const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                                if (bkpConf.dayOfMonth && Number.isInteger(bkpConf.dayOfMonth)) {
                                    if (now.getDate() === bkpConf.dayOfMonth || bkpConf.dayOfMonth > lastDay.getDate() && now.getDate() === lastDay.getDate()) {
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
                                await this.pgDump(con.id, null, Object.assign(Object.assign({}, bkpConf.options), { initiator: AUTO_INITIATOR }));
                                if (bkpConf.keepLast && bkpConf.keepLast > 0) {
                                    const toKeepIds = (await this.dbs.backups.find(bkpFilter, { select: { id: 1 }, orderBy: { created: -1 }, limit: bkpConf.keepLast })).map(c => c.id);
                                    await this.dbs.backups.delete(Object.assign({ "id.$nin": toKeepIds }, bkpFilter));
                                }
                            }
                        }
                    };
                    /** Local backup, check for space */
                    if (!((_b = bkpConf === null || bkpConf === void 0 ? void 0 : bkpConf.cloudConfig) === null || _b === void 0 ? void 0 : _b.credential_id)) {
                        const space = await this.checkIfEnoughSpace(con.id);
                        if (space.err) {
                            if ((bkpConf === null || bkpConf === void 0 ? void 0 : bkpConf.err) !== space.err) {
                                await this.dbs.connections.update({ id: con.id }, { backups_config: Object.assign(Object.assign({}, bkpConf), { err: space.err }) });
                            }
                        }
                        else {
                            await dump();
                        }
                    }
                    else {
                        await dump();
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (connections_1_1 && !connections_1_1.done && (_a = connections_1.return)) await _a.call(connections_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }, HOUR / 4);
        // }, 1000)
    }
    async destroy() {
        clearInterval(this.interval);
    }
}
exports.default = BackupManager;
exports.BACKUP_FOLDERNAME = "prostgles_backups";
const localFolderPath = path_1.default.resolve(__dirname + '/../' + exports.BACKUP_FOLDERNAME);
async function getFileMgr(dbs, credId) {
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
function pipeFromCommand(command, 
// opts: SpawnOptionsWithoutStdio | string[], 
opts, destination, onEnd, onStdout, useExec = false) {
    const execCommand = `${command} ${opts.join(" ")}`;
    const proc = useExec ? child_process_1.default.exec(execCommand, console.log) : child_process_1.default.spawn(command, opts);
    const getUTFText = (v) => v.toString(); //.replaceAll(/[^\x00-\x7F]/g, ""); //.replaceAll("\\", "[escaped backslash]");   // .replaceAll("\\u0000", "");
    let fullLog = "";
    const lastSent = Date.now();
    let log;
    proc.stderr.on('data', (data) => {
        log = getUTFText(data);
        fullLog += log;
        const now = Date.now();
        if (lastSent > now - 1000) {
            onStdout === null || onStdout === void 0 ? void 0 : onStdout(fullLog, true);
        }
    });
    proc.stdout.on('data', (data) => {
        onStdout === null || onStdout === void 0 ? void 0 : onStdout(getUTFText(data));
    });
    proc.stdout.on('error', function (err) {
        onEnd(err !== null && err !== void 0 ? err : "proc.stdout 'error'");
    });
    proc.stdin.on('error', function (err) {
        onEnd(err !== null && err !== void 0 ? err : "proc.stdin 'error'");
    });
    proc.on('error', function (err) {
        onEnd(err !== null && err !== void 0 ? err : "proc 'error'");
    });
    proc.stdout.pipe(destination, { end: false });
    proc.on('exit', function (code, signal) {
        if (code) {
            onEnd(log !== null && log !== void 0 ? log : "Error");
        }
        else {
            onEnd();
            destination.end();
        }
    });
    return proc;
}
exports.pipeFromCommand = pipeFromCommand;
function pipeToCommand(command, opts, source, onEnd, onStdout, useExed = false) {
    const proc = useExed ? child_process_1.default.exec(`${command} ${opts.join(" ")}`) : child_process_1.default.spawn(command, opts);
    let log;
    let fullLog = "";
    proc.stderr.on('data', (data) => {
        log = data.toString();
        fullLog += log;
        onStdout === null || onStdout === void 0 ? void 0 : onStdout(fullLog, true);
        console.error(`stderr: ${data.toString()}`);
    });
    proc.stdout.on('data', (data) => {
        const log = data.toString();
        fullLog += log;
        onStdout === null || onStdout === void 0 ? void 0 : onStdout(fullLog);
    });
    proc.stdout.on('error', function (err) {
        onEnd(err !== null && err !== void 0 ? err : "proc.stdout 'error'");
    });
    proc.stdin.on('error', function (err) {
        onEnd(err !== null && err !== void 0 ? err : "proc.stdin 'error'");
    });
    proc.on('error', function (err) {
        onEnd(err !== null && err !== void 0 ? err : "proc 'error'");
    });
    source.pipe(proc.stdin);
    proc.on('exit', function (code, signal) {
        console.error({ proc, code });
        if (code) {
            source.destroy();
        }
        onEnd === null || onEnd === void 0 ? void 0 : onEnd(code ? (log !== null && log !== void 0 ? log : "Error") : undefined);
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
function getSSLEnvVars(c) {
    let result = "";
    if (c.db_ssl) {
        result += ` PGSSLMODE=${JSON.stringify(c.db_ssl)} `;
    }
    if (c.db_pass) {
        result += ` PGPASSWORD=${JSON.stringify(c.db_pass)} `;
    }
    if (c.ssl_client_certificate) {
        result += ` PGSSLCERT=${JSON.stringify(index_1.connMgr.getCertPath(c.id, "cert"))}`;
    }
    if (c.ssl_client_certificate_key) {
        result += ` PGSSLKEY=${JSON.stringify(index_1.connMgr.getCertPath(c.id, "key"))} `;
    }
    if (c.ssl_certificate) {
        result += ` PGSSLROOTCERT=${JSON.stringify(index_1.connMgr.getCertPath(c.id, "ca"))} `;
    }
    return result;
}
// process.stdout.on("error", (err) => {
//   debugger
// });
// process.on('uncaughtException', function (err) {
//   console.error(err);
//   console.log("Node NOT Exiting...");
// });
//# sourceMappingURL=BackupManager.js.map