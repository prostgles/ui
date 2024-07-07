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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tout = exports.restartProc = exports.onServerReady = exports.connMgr = exports.connectionChecker = exports.MEDIA_ROUTE_PREFIX = exports.log = exports.API_PATH = void 0;
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_1 = __importStar(require("express"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
const publishUtils_1 = require("../../commonTypes/publishUtils");
const ConnectionChecker_1 = require("./ConnectionChecker");
const ConnectionManager_1 = require("./ConnectionManager/ConnectionManager");
const electronConfig_1 = require("./electronConfig");
const setDBSRoutesForElectron_1 = require("./setDBSRoutesForElectron");
const startProstgles_1 = require("./startProstgles");
const app = (0, express_1.default)();
if (process.env.PRGL_TEST || true) {
    app.use((req, res, next) => {
        res.on("finish", () => {
            console.log(`${(new Date()).toISOString()} ${req.method} ${res.statusCode} ${req.url} ${res.statusCode === 302 ? res.getHeader("Location") : ""}`);
        });
        next();
    });
}
// if(PubSubManager.EXCLUDE_QUERY_FROM_SCHEMA_WATCH_ID !== QUERY_WATCH_IGNORE){
//   throw "Invalid QUERY_WATCH_IGNORE";
// } 
exports.API_PATH = "/api";
app.use((0, express_1.json)({ limit: "100mb" }));
app.use((0, express_1.urlencoded)({ extended: true, limit: "100mb" }));
app.use(function (req, res, next) {
    /* data import (papaparse) requires: worker-src blob: 'self' */
    res.setHeader("Content-Security-Policy", " script-src 'self'; frame-src 'self'; worker-src blob: 'self';");
    next();
});
process.on("unhandledRejection", (reason, p) => {
    console.trace("Unhandled Rejection at: Promise", p, "reason:", reason);
});
const http = http_1.default.createServer(app);
const log = (msg, extra) => {
    console.log(...[`(server): ${(new Date()).toISOString()} ` + msg, extra].filter(v => v));
};
exports.log = log;
app.use(express_1.default.static(path_1.default.resolve(electronConfig_1.actualRootDir + "/../client/build"), { index: false }));
app.use(express_1.default.static(path_1.default.resolve(electronConfig_1.actualRootDir + "/../client/static"), { index: false }));
app.use((0, cookie_parser_1.default)());
exports.MEDIA_ROUTE_PREFIX = `/prostgles_media`;
exports.connectionChecker = new ConnectionChecker_1.ConnectionChecker(app);
const ioPath = process.env.PRGL_IOPATH || "/iosckt";
const io = new socket_io_1.Server(http, {
    path: ioPath,
    maxHttpBufferSize: 100e100,
    cors: exports.connectionChecker.withOrigin
});
exports.connMgr = new ConnectionManager_1.ConnectionManager(http, app, exports.connectionChecker.withOrigin);
const electronConfig = (0, electronConfig_1.getElectronConfig)();
const PORT = electronConfig ? (electronConfig.port ?? 3099) : +(process.env.PROSTGLES_UI_PORT ?? 3004);
const LOCALHOST = "127.0.0.1";
const HOST = electronConfig ? LOCALHOST : (process.env.PROSTGLES_UI_HOST || LOCALHOST);
(0, setDBSRoutesForElectron_1.setDBSRoutesForElectron)(app, io, PORT);
/** Make client wait for everything to load before serving page */
const awaitInit = () => {
    return new Promise((resolve) => {
        const _initState = (0, startProstgles_1.getInitState)();
        if (!_initState.loaded && (!_initState.isElectron || _initState.electronCredsProvided)) {
            const interval = setInterval(() => {
                if ((0, startProstgles_1.getInitState)().loaded) {
                    resolve(_initState);
                    clearInterval(interval);
                }
            }, 200);
        }
        else {
            resolve(_initState);
        }
    });
};
/**
 * Serve prostglesInitState
 */
app.get("/dbs", (req, res) => {
    const serverState = (0, startProstgles_1.getInitState)();
    res.json(serverState);
});
/* Must provide index.html if there is an error OR prostgles is loading */
const serveIndexIfNoCredentials = async (req, res, next) => {
    const { isElectron, ok, electronCredsProvided, connectionError, initError, loading } = (0, startProstgles_1.getInitState)();
    const error = connectionError || initError;
    if (error || isElectron && !electronCredsProvided || loading) {
        await awaitInit();
        if (req.method === "GET" && !req.path.startsWith("/dbs")) {
            res.sendFile(path_1.default.resolve(electronConfig_1.actualRootDir + "/../client/build/index.html"));
            return;
        }
    }
    next();
};
app.use(serveIndexIfNoCredentials);
/** Startup procedure
 * If electron:
 *  - serve index
 *  - serve prostglesInitState
 *  - Check for any existing older prostgles schema versions AND allow deleting curr db OR connect to new db
 *  - start prostgles IF or WHEN creds provided
 *  - remove serve index after prostgles is ready
 *
 * If docker/default
 *  - serve index if loading
 *  - serve prostglesInitState
 *  - try start prostgles
 *  - If failed to connect then also serve index
 */
if (electronConfig) {
    const creds = electronConfig.getCredentials();
    if (creds) {
        (0, startProstgles_1.tryStartProstgles)({ app, io, con: creds, port: PORT });
    }
    else {
        console.log("Electron: No credentials");
    }
    (0, setDBSRoutesForElectron_1.setDBSRoutesForElectron)(app, io, PORT);
}
else {
    (0, startProstgles_1.tryStartProstgles)({ app, io, port: PORT, con: undefined });
}
const onServerReadyListeners = [];
const onServerReady = async (cb) => {
    const _initState = (0, startProstgles_1.getInitState)();
    if (_initState.httpListening) {
        cb(_initState.httpListening.port);
    }
    else {
        onServerReadyListeners.push(cb);
    }
};
exports.onServerReady = onServerReady;
const server = http.listen(PORT, HOST, () => {
    const address = server.address();
    const port = (0, publishUtils_1.isObject)(address) ? address.port : PORT;
    const host = (0, publishUtils_1.isObject)(address) ? address.address : HOST;
    const _initState = (0, startProstgles_1.getInitState)();
    _initState.httpListening = {
        port
    };
    onServerReadyListeners.forEach(cb => {
        cb(port);
    });
    console.log(`\n\nexpress listening on port ${port} (${host}:${port})\n\n`);
});
const spawn = require("child_process").spawn;
function restartProc(cb) {
    console.warn("Restarting process");
    if (process.env.process_restarting) {
        delete process.env.process_restarting;
        // Give old process one second to shut down before continuing ...
        setTimeout(() => {
            cb?.();
            restartProc();
        }, 1000);
        return;
    }
    // Restart process ...
    spawn(process.argv[0], process.argv.slice(1), {
        env: { process_restarting: 1 },
        stdio: "ignore"
    }).unref();
}
exports.restartProc = restartProc;
const tout = (timeout) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(true);
        }, timeout);
    });
};
exports.tout = tout;
//# sourceMappingURL=index.js.map