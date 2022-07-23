"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileMgr = exports.BACKUP_FOLDERNAME = exports.publishMethods = void 0;
const index_1 = require("./index");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = __importDefault(require("child_process"));
// import ss from 'socket.io-stream';
const FileManager_1 = __importDefault(require("prostgles-server/dist/FileManager"));
const PubSubManager_1 = require("prostgles-server/dist/PubSubManager");
const getConnectionUri = (c) => c.db_conn || `postgres://${c.db_user}:${c.db_pass || ""}@${c.db_host || "localhost"}:${c.db_port || "5432"}/${c.db_name}`;
const publishMethods = async (params) => {
    const { user, dbo: dbs, socket, db: _dbs } = params;
    if (!user || !user.id) {
        const makeMagicLink = async (user, dbo, returnURL) => {
            const mlink = await dbo.magic_links.insert({
                expires: Number.MAX_SAFE_INTEGER,
                user_id: user.id,
            }, { returning: "*" });
            return {
                id: user.id,
                magic_login_link_redirect: `/magic-link/${mlink.id}?returnURL=${returnURL}`
            };
        };
        /** If no user exists then make */
        if (await (0, index_1.HAS_EMPTY_USERNAME)(dbs)) {
            const u = await dbs.users.findOne({ username: index_1.EMPTY_USERNAME });
            if (!u)
                throw "User found for magic link";
            const mlink = await makeMagicLink(u, dbs, "/");
            socket.emit("redirect", mlink.magic_login_link_redirect);
        }
        return {};
    }
    const adminMethods = {
        getDBSize: async (conId) => {
            var _a, _b, _c;
            const db = index_1.connMgr.getConnection(conId);
            const size = await ((_c = (_b = (_a = db === null || db === void 0 ? void 0 : db.prgl) === null || _a === void 0 ? void 0 : _a.db) === null || _b === void 0 ? void 0 : _b.sql) === null || _c === void 0 ? void 0 : _c.call(_b, "SELECT pg_size_pretty( pg_database_size(current_database()) ) ", {}, { returnType: "value" }));
            return size;
        },
        getFileFolderSizeInBytes: (conId) => {
            const dirSize = async (directory) => {
                const files = fs_1.default.readdirSync(directory);
                const stats = files.map(file => fs_1.default.statSync(path_1.default.join(directory, file)));
                return stats.reduce((accumulator, { size }) => accumulator + size, 0);
            };
            if (conId && (typeof conId !== "string" || !index_1.connMgr.getConnection(conId))) {
                throw "Invalid/Inexisting connection id provided";
            }
            const dir = index_1.connMgr.getFileFolderPath(conId);
            return dirSize(dir);
        },
        testDBConnection: async (opts) => (0, index_1.testDBConnection)(opts),
        createConnection: async (con) => {
            const row = Object.assign(Object.assign({}, (0, PubSubManager_1.omitKeys)(con, ["type"])), { user_id: user.id });
            // console.log("createConnection", row)
            try {
                await (0, index_1.testDBConnection)(con);
                let res;
                if (con.id) {
                    res = await dbs.connections.update({ id: con.id }, (0, PubSubManager_1.omitKeys)(row, ["id"]), { returning: "*" });
                }
                else {
                    res = await dbs.connections.insert(row, { returning: "*" });
                }
                return res;
            }
            catch (e) {
                console.error(e);
                if (e && e.code === "23502") {
                    throw { err_msg: ` ${e.column} cannot be empty` };
                }
                else if (e && e.code === "23505") {
                    throw { err_msg: `Connection ${JSON.stringify(con.name)} already exists` };
                }
                throw e;
            }
        },
        deleteConnection: async (id) => {
            return dbs.connections.delete({ id, user_id: user.id }, { returning: "*" });
        },
        reStartConnection: async (conId) => {
            return index_1.connMgr.startConnection(conId, socket, dbs, _dbs, true);
        },
        pgDump: async (conId, credId) => {
            var _a, _b, _c, _d;
            const con = await dbs.connections.findOne({ id: conId });
            if (!con)
                throw new Error("Could not find the connection");
            const setError = (err) => {
                if (backup_id) {
                    dbs.backups.update({ id: backup_id }, { status: { err } });
                }
                else {
                    throw err;
                }
            };
            const { fileMgr } = await getFileMgr(dbs, credId);
            let backup_id;
            const uri = getConnectionUri(con);
            const dumpCommand = {
                command: "pg_dump",
                opts: [uri, "--clean"]
            };
            try {
                const db = index_1.connMgr.getConnection(conId);
                const backup = await dbs.backups.insert({
                    dbSizeInBytes: (_d = (await ((_c = (_b = (_a = db === null || db === void 0 ? void 0 : db.prgl) === null || _a === void 0 ? void 0 : _a.db) === null || _b === void 0 ? void 0 : _b.sql) === null || _c === void 0 ? void 0 : _c.call(_b, "SELECT pg_database_size(current_database())  ", {}, { returnType: "value" })))) !== null && _d !== void 0 ? _d : 0,
                    connection_id: con.id,
                    credential_id: credId !== null && credId !== void 0 ? credId : null,
                    destination: credId ? "Cloud" : "Local",
                    dump_command: dumpCommand.command + " " + dumpCommand.opts.join(" "),
                    status: { loading: {} }
                }, { returning: "*" });
                backup_id = backup.id;
                // const stream = ss.createStream();
                // ss(socket).emit('pg_dump', stream);
                const destStream = fileMgr.uploadStream(backup_id, "text/sql", async (loading) => {
                    const bkp = await dbs.backups.findOne({ id: backup_id });
                    if (!bkp || !bkp.status.err && !bkp.status.ok) {
                        dbs.backups.update({ id: backup_id }, { status: { loading } });
                    }
                }, setError, async (item) => {
                    dbs.backups.update({ id: backup_id }, { sizeInBytes: item.content_length, uploaded: new Date(), status: { ok: 1 } });
                });
                // pipeFromCommand('pg_dump', [command, "--format", "custom", "-O", "-v"], destStream, setError);
                const proc = pipeFromCommand(dumpCommand.command, dumpCommand.opts, destStream, setError);
                let interval = setInterval(async () => {
                    const bkp = await dbs.backups.findOne({ id: backup_id });
                    if (!bkp || (bkp === null || bkp === void 0 ? void 0 : bkp.status.err)) {
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
        },
        pgRestore: async (bkpId) => {
            const { fileMgr, bkp, cred } = await getBkp(dbs, bkpId);
            const con = await dbs.connections.findOne({ id: bkp.connection_id });
            const setError = (err) => {
                dbs.backups.update({ id: bkpId }, { restore_status: { err } });
            };
            try {
                const bkpStream = await fileMgr.getFileStream(bkp.id);
                const restoreCmd = {
                    command: "psql",
                    opts: [getConnectionUri(con)]
                };
                await dbs.backups.update({ id: bkpId }, { restore_start: new Date(), restore_command: restoreCmd.command + " " + restoreCmd.opts.join(" "), restore_status: { loading: 1 } });
                // pipeToCommand("pg_restore", ["-c", "-C",`-d '${getConnectionUri(con)}'`, "-v"], bkpStream, err => {
                pipeToCommand(restoreCmd.command, restoreCmd.opts, bkpStream, err => {
                    if (err) {
                        console.error(err);
                        bkpStream.destroy();
                        setError(err);
                    }
                    else {
                        dbs.backups.update({ id: bkpId }, { restore_end: new Date(), restore_status: { ok: new Date() } });
                    }
                });
            }
            catch (err) {
                setError(err);
            }
        },
        bkpDelete: async (bkpId, force = false) => {
            const { fileMgr, bkp } = await getBkp(dbs, bkpId);
            try {
                await fileMgr.deleteFile(bkp.id);
            }
            catch (err) {
                if (!force)
                    throw err;
            }
            await dbs.backups.delete({ id: bkp.id });
            return bkp.id;
        }
    };
    return Object.assign(Object.assign({}, (user.type === "admin" ? adminMethods : undefined)), { startConnection: async (con_id) => {
            return index_1.connMgr.startConnection(con_id, socket, dbs, _dbs);
        } });
};
exports.publishMethods = publishMethods;
exports.BACKUP_FOLDERNAME = "prostgles_backups";
async function getFileMgr(dbs, credId) {
    let cred;
    if (credId) {
        cred = await dbs.credentials.findOne({ id: credId, type: "s3" });
        if (!cred)
            throw new Error("Could not find the credentials");
    }
    const fileMgr = new FileManager_1.default(cred ? { accessKeyId: cred.key_id, secretAccessKey: cred.key_secret, bucket: cred.bucket, region: cred.region } : { localFolderPath: path_1.default.resolve(__dirname + '/../' + exports.BACKUP_FOLDERNAME) });
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
function pipeFromCommand(command, opts, destination, onEnd, onSuccess) {
    const proc = child_process_1.default.spawn(command, opts);
    // myREPL.stdout.on('data', (data) => {
    //   console.log(`stdout: ${data}`);
    // });
    let errored = false;
    proc.stderr.on('data', (data) => {
        errored = true;
        console.error(`stderr: ${data.toString()}`);
        onEnd(data.toString());
    });
    proc.stdout.pipe(destination, { end: false });
    proc.on('exit', function (code, signal) {
        if (errored && code) {
        }
        else {
            onSuccess === null || onSuccess === void 0 ? void 0 : onSuccess();
            destination.end();
        }
    });
    return proc;
}
function pipeToCommand(command, opts, source, onEnd) {
    const proc = child_process_1.default.spawn(command, opts);
    // myREPL.stdout.on('data', (data) => {
    //   console.log(`stdout: ${data}`);
    // });
    let errored = false;
    proc.stderr.on('data', (data) => {
        var _a;
        errored = true;
        console.error(`stderr: ${data.toString()}`);
        onEnd((_a = data.toString()) !== null && _a !== void 0 ? _a : "error");
    });
    source.pipe(proc.stdin);
    proc.on('exit', function (code, signal) {
        if (errored && code) {
        }
        else {
            onEnd === null || onEnd === void 0 ? void 0 : onEnd();
        }
    });
    return proc;
}
//# sourceMappingURL=publishMethods.js.map