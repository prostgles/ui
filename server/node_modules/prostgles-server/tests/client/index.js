"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prostgles_client_1 = __importDefault(require("prostgles-client"));
const socket_io_client_1 = __importDefault(require("socket.io-client"));
const isomorphic_queries_1 = __importDefault(require("../isomorphic_queries"));
const client_only_queries_1 = __importDefault(require("../client_only_queries"));
const start = Date.now();
const log = (msg, extra) => {
    console.log(...[`(client) t+ ${(Date.now() - start)}ms ` + msg, extra].filter(v => v));
};
log("Started client...");
const url = process.env.PRGL_CLIENT_URL || "http://127.0.0.1:3001", path = process.env.PRGL_CLIENT_PATH || "/teztz/s", socket = (0, socket_io_client_1.default)(url, { path, query: { token: "haha" } }), //  
stopTest = (err) => {
    if (err)
        log("Stopping client due to error: " + JSON.stringify(err));
    setTimeout(() => {
        socket.emit("stop-test", !err ? err : { err: err.toString(), error: err }, cb => {
            log("Stopping client...");
            if (err)
                console.trace(err);
        });
        setTimeout(() => {
            process.exit(err ? 1 : 0);
        }, 1000);
    }, 1000);
};
try {
    /* TODO find out why connection does not happen on rare occasions*/
    socket.on("connected", () => {
        log("Client connected.");
    });
    socket.on("connect", () => {
        log("Client connect.");
    });
    socket.on("connect_failed", (err) => {
        log("connect_failed", err);
    });
    socket.on("start-test", (data) => {
        log("start-test", data);
        (0, prostgles_client_1.default)({
            socket,
            onReconnect: (socket) => {
                log("Reconnected");
            },
            onReady: async (db, methods, tableSchema, auth) => {
                log("onReady.auth", auth);
                try {
                    log("Starting Client isomorphic tests");
                    // try {
                    await (0, isomorphic_queries_1.default)(db);
                    // } catch(e){
                    //   throw { isoErr: e }
                    // }
                    log("Client isomorphic tests successful");
                    // try {
                    await (0, client_only_queries_1.default)(db, auth, log, methods, tableSchema);
                    // } catch(e){
                    //   throw { ClientErr: e }
                    // }
                    log("Client-only replication tests successful");
                    stopTest();
                }
                catch (err) {
                    console.trace(err);
                    stopTest(err);
                    // throw err;
                }
            }
        });
    });
}
catch (e) {
    console.trace(e);
    stopTest(e);
    throw e;
}
