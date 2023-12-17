"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pgRestore = void 0;
const PubSubManager_1 = require("prostgles-server/dist/PubSubManager/PubSubManager");
const prostgles_types_1 = require("prostgles-types");
const pipeFromCommand_1 = require("./pipeFromCommand");
const utils_1 = require("./utils");
const pipeToCommand_1 = require("./pipeToCommand");
async function pgRestore(arg1, stream, o) {
    const { bkpId, connId } = arg1;
    const { fileMgr, bkp } = await (0, utils_1.getBkp)(this.dbs, bkpId);
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
        const SSL_ENV_VARS = (0, utils_1.getSSLEnvVars)(con, this.connMgr);
        const ConnectionEnvVars = (0, utils_1.getConnectionEnvVars)(con);
        const ENV_VARS = { ...SSL_ENV_VARS, ...ConnectionEnvVars };
        const bkpStream = stream ?? await fileMgr.getFileStream(bkp.id);
        const restoreCmd = (o.command === "psql" || o.format === "p") ? {
            command: this.getCmd("psql"),
            // opts: [getConnectionUri(con as any)] // NOT SAFE ps aux
            opts: []
        } : {
            command: this.getCmd("pg_restore"),
            opts: (0, utils_1.addOptions)(
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
            restore_command: (0, pipeFromCommand_1.envToStr)(ENV_VARS) + restoreCmd.command + " " + restoreCmd.opts.join(" "),
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
        const proc = (0, pipeToCommand_1.pipeToCommand)(restoreCmd.command, restoreCmd.opts, ENV_VARS, bkpStream, err => {
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
                const restore_logs = (0, utils_1.makeLogs)(_restore_logs, currBkp.restore_logs, currBkp.restore_start); // currBkp.restore_logs
                this.dbs.backups.update({ id: bkpId }, { restore_end: new Date(), restore_logs, last_updated: new Date() });
            }
        }, false);
    }
    catch (err) {
        setError(err);
    }
}
exports.pgRestore = pgRestore;
//# sourceMappingURL=pgRestore.js.map