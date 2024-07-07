"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debounce = exports.ForkedPrglProcRunner = exports.FORKED_PROC_ENV_NAME = void 0;
const child_process_1 = require("child_process");
const prostgles_types_1 = require("prostgles-types");
const forkedProcess_1 = require("./forkedProcess");
exports.FORKED_PROC_ENV_NAME = "IS_FORKED_PROC";
class ForkedPrglProcRunner {
    currentRunId = 1;
    opts;
    proc;
    runQueue = {};
    stdout = [];
    stderr = [];
    logs = [];
    databaseNotFound = false;
    destroy = (databaseNotFound = false) => {
        this.databaseNotFound = databaseNotFound;
        this.proc.kill("SIGKILL");
    };
    constructor(proc, opts) {
        this.proc = proc;
        this.opts = opts;
        this.initProc();
    }
    isRestarting = false;
    restartProc = debounce((error) => {
        if (this.isRestarting || this.databaseNotFound)
            return;
        const logName = `ForkedPrglProcRunner (${this.opts.type})`;
        this.isRestarting = true;
        console.error(`${logName} restartProc. error:`, error);
        Object.entries(this.runQueue).forEach(([id, { cb }]) => {
            cb("Forked process error");
            delete this.runQueue[id];
        });
        console.log(`${logName} restarting ...`);
        setTimeout(async () => {
            console.log(`${logName} restarted`);
            const newProc = await ForkedPrglProcRunner.createProc(this.opts.initArgs);
            this.proc = newProc;
            this.initProc();
            if (this.opts.type === "onMount") {
                this.run({ type: "onMount", code: this.opts.on_mount_ts_compiled });
            }
            this.isRestarting = false;
        }, 1e3);
    }, 400);
    initProc = () => {
        const updateLogs = (dataOrError) => {
            const stringMessage = Buffer.isBuffer(dataOrError) ? dataOrError.toString() : (0, prostgles_types_1.isObject)(dataOrError) ? JSON.stringify(dataOrError, null, 2) + "\n" : dataOrError;
            this.logs.push(`${(new Date()).toISOString()} ${stringMessage}`);
            this.logs = this.logs.slice(-500);
            const { type } = this.opts;
            const logs = this.logs.map(v => v.toString()).join("");
            this.opts.dbs.database_config_logs.update({ id: this.opts.dbConfId }, { [type === "onMount" ? "on_mount_logs" :
                    type === "tableConfig" ? "table_config_logs" :
                        "on_run_logs"]: logs,
            });
        };
        this.proc.on("exit", (code) => {
            this.restartProc(code);
        });
        this.proc.on("message", (msg) => {
            if ("type" in msg) {
                console.error("ForkedPrglProc error ", msg.error);
                updateLogs((0, forkedProcess_1.getError)(msg.error));
                /** Database was dropped */
                if (msg.error.code === "3D000") {
                    this.destroy(true);
                }
                return;
            }
            /** This is the onReady/onReady reload callback */
            if (msg.id === "1" && msg.result === "reload") {
                if (this.opts.type !== "tableConfig") {
                    // Reload schema;
                    this.proc.kill();
                }
                return;
            }
            const req = this.runQueue[msg.id];
            if (!req) {
                console.error("ForkedPrglProcRunner queue item not found", msg, process.pid);
            }
            req?.cb(msg.error, msg.result);
            delete this.runQueue[msg.id];
        });
        this.proc.on("error", (error) => {
            this.restartProc(error);
        });
        this.opts.dbs.database_config_logs.insert({ id: this.opts.dbConfId }, { onConflict: "DoNothing" });
        this.proc.stdout?.on("data", updateLogs);
        this.proc.stdout?.on("error", updateLogs);
        this.proc.stderr?.on("data", updateLogs);
        this.proc.stderr?.on("error", updateLogs);
    };
    static createProc = (initOpts) => {
        return new Promise((resolve, reject) => {
            const proc = (0, child_process_1.fork)(__dirname + "/forkedProcess.js", {
                execArgv: [],
                silent: true,
                env: { [exports.FORKED_PROC_ENV_NAME]: "true" }
            });
            proc.on("error", reject);
            const onStart = (message) => {
                proc.off("error", reject);
                if (message.error || !("id" in message) || message.id !== "1") {
                    reject(message.error ?? "Something is wrong with the forked process");
                }
                else {
                    resolve(proc);
                }
                proc.off("message", onStart);
            };
            proc.on("message", onStart);
            proc.send({ id: "1", type: "start", initArgs: initOpts });
        });
    };
    static create = async (opts) => {
        const proc = await ForkedPrglProcRunner.createProc(opts.initArgs);
        return new ForkedPrglProcRunner(proc, opts);
    };
    run = async (runProps) => {
        this.currentRunId++;
        const id = this.currentRunId.toString();
        return new Promise((resolve, reject) => {
            this.runQueue[id] = {
                id,
                ...runProps,
                cb: (err, res) => {
                    if (err)
                        reject(err);
                    else
                        resolve(res);
                }
            };
            try {
                if (!this.proc.connected) {
                    throw "Forked process not connected";
                }
                this.proc.send({ id, ...runProps });
            }
            catch (error) {
                reject(error);
            }
        });
    };
    getProcStats = async () => {
        return this.run({ type: "procStats" }).then(v => v);
    };
}
exports.ForkedPrglProcRunner = ForkedPrglProcRunner;
function debounce(func, timeout) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func(...args);
        }, timeout);
    };
}
exports.debounce = debounce;
//# sourceMappingURL=ForkedPrglProcRunner.js.map