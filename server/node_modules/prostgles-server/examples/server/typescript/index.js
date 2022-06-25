"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
// const prostgles = require("prostgles-server");
const index_1 = __importDefault(require("../../../dist/index"));
const app = express_1.default();
const http = require('http').createServer(app);
const io = require("socket.io")(http);
http.listen(3001);
index_1.default({
    dbConnection: {
        host: "localhost",
        port: 5432,
        database: "postgres",
        user: process.env.PRGL_USER,
        password: process.env.PRGL_PWD
    },
    sqlFilePath: path_1.default.join(__dirname + '/init.sql'),
    io,
    tsGeneratedTypesDir: path_1.default.join(__dirname + '/'),
    transactions: "tt",
    publish: (socket, dbo) => {
        return "*";
    },
    joins: [
        {
            tables: ["items", "items2"],
            on: { name: "name" },
            type: "many-many"
        },
        {
            tables: ["items2", "items3"],
            on: { name: "name" },
            type: "many-many"
        }
    ],
    onReady: async (dbo, db) => {
        app.get("*", (req, res) => {
            console.log(req.originalUrl);
        });
        try {
            await dbo.items.insert([{ name: "a" }, { name: "a" }]);
            console.log(await dbo.items.find());
        }
        catch (err) {
            console.error(err);
        }
    },
});
//# sourceMappingURL=index.js.map