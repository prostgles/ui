"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCpuPercentage = exports.initForkedProc = exports.getError = void 0;
const prostgles_server_1 = __importDefault(require("prostgles-server"));
const ForkedPrglProcRunner_1 = require("./ForkedPrglProcRunner");
const getError = (rawError) => {
    return rawError instanceof Error ? Object.fromEntries(Object.getOwnPropertyNames(rawError).map(key => [key, rawError[key]])) : rawError;
};
exports.getError = getError;
const initForkedProc = () => {
    let _prglParams;
    let prglParams;
    const setProxy = (params) => {
        prglParams ??= new Proxy(params, {
            get(target, prop, receiver) {
                return _prglParams[prop];
            },
        });
    };
    const sendError = (error) => {
        process.send?.({ type: "error", error: (0, exports.getError)(error) });
    };
    process.on("unhandledRejection", (reason, p) => {
        console.error("Unhandled Rejection at: Promise", p, "reason:", reason);
        sendError(reason);
    });
    process.on("uncaughtException", (error, origin) => {
        console.error("Uncaught Exception: ", error, "origin:", origin);
        sendError(error);
    });
    if (!process.send) {
        console.error("No process.send");
    }
    process.on("message", async (msg) => {
        try {
            const cb = (error, result) => {
                process.send({ id: msg.id, error, result });
            };
            if (msg.type === "procStats") {
                cb(undefined, {
                    pid: process.pid,
                    cpu: await (0, exports.getCpuPercentage)(),
                    mem: process.memoryUsage().heapUsed,
                    uptime: process.uptime(),
                });
            }
            else if (msg.type === "start") {
                if (prglParams)
                    throw "Already started";
                //@ts-ignore
                await (0, prostgles_server_1.default)({
                    ...msg.initArgs,
                    watchSchema: "*",
                    transactions: true,
                    onReady: (params) => {
                        if (prglParams) {
                            // console.error("reload", msg)
                            cb(undefined, "reload");
                        }
                        else {
                            cb(undefined, "ready");
                        }
                        _prglParams = params;
                        setProxy(params);
                    },
                });
            }
            else {
                if (!prglParams)
                    throw "prgl not ready";
                try {
                    if (msg.type === "run") {
                        const { code, validatedArgs, user } = msg;
                        const { run } = eval(code + "\n\n exports;");
                        const methodResult = await run(validatedArgs, { ...prglParams, user });
                        cb(undefined, methodResult);
                    }
                    else {
                        const { code } = msg;
                        const { onMount } = eval(code + "\n\n exports;");
                        const methodResult = await onMount(prglParams);
                        cb(undefined, methodResult);
                    }
                }
                catch (rawError) {
                    const error = (0, exports.getError)(rawError);
                    console.error("forkedProcess error", error);
                    cb(error);
                }
            }
        }
        catch (error) {
            console.error(error);
            sendError(error);
        }
    });
};
exports.initForkedProc = initForkedProc;
if (process.env[ForkedPrglProcRunner_1.FORKED_PROC_ENV_NAME]) {
    (0, exports.initForkedProc)();
}
const getCpuPercentage = async () => {
    const interval = 1000;
    const getTotal = (prevUsage) => {
        const { system, user } = process.cpuUsage(prevUsage);
        const total = system + user;
        return { total, system, user };
    };
    const start = getTotal();
    await tout(interval);
    const end = getTotal(start);
    const delta = end.total / 1000;
    const percentage = 100 * (delta / interval);
    return percentage;
};
exports.getCpuPercentage = getCpuPercentage;
const tout = (timeout) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(true);
        }, timeout);
    });
};
//# sourceMappingURL=forkedProcess.js.map