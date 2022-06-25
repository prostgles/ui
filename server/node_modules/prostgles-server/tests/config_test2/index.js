"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* Dashboard */
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const prostgles_server_1 = __importDefault(require("prostgles-server"));
process.on('unhandledRejection', (reason, p) => {
    console.trace('Unhandled Rejection at:', p, 'reason:', reason);
    process.exit(1);
});
const app = express_1.default();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
const _http = require("http");
const http = _http.createServer(app);
const io = require("socket.io")(http, {
    path: "/s"
});
http.listen(process.env.NPORT || 30011);
const log = (msg, extra) => {
    console.log(...["(server): " + msg, extra].filter(v => v));
};
console.log(2);
prostgles_server_1.default({
    dbConnection: {
        host: process.env.POSTGRES_HOST || "localhost",
        port: +process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || "postgres",
        user: process.env.POSTGRES_USER || "api",
        password: process.env.POSTGRES_PASSWORD || "api",
        application_name: "hehe" + Date.now()
    },
    io,
    tsGeneratedTypesDir: path_1.default.join(__dirname + '/'),
    watchSchema: s => {
        // console.log(s.command)
    },
    sqlFilePath: path_1.default.join(__dirname + '/init.sql'),
    // transactions: true,	
    joins: "inferred",
    publishRawSQL: async (socket, db, _db, user) => {
        // log("set auth logic")
        return true;
    },
    publish: async (socket, dbo, _db, user) => {
        return {
            various: "*",
        };
    },
    onReady: async (db, _db) => {
        // await _db.any("CREATE TABLE IF NOT EXISTS ttt(id INTEGER, t TEXT)");
        // console.log(await db.various.find({ "id.<": 1423 }) )
        // db.various.subscribe({ "id.<": 1423 }, {}, console.log)
        // console.log(await db.lookup_status.getJoinedTables())
    },
});
