"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = express_1.default();
const path_1 = __importDefault(require("path"));
var http = require('http').createServer(app);
var io = require("socket.io")(http);
http.listen(30009);
var prostgles = require("../../dist/index");
prostgles({
    dbConnection: {
        host: "localhost",
        port: 5432,
        database: "example",
        user: process.env.PRGL_USER,
        password: process.env.PRGL_PWD
    },
    // dbOptions: {
    //     application_name: "prostgles_api",
    //     max: 100,
    //     poolIdleTimeout: 10000
    // },
    sqlFilePath: path_1.default.join(__dirname + '/init.sql'),
    io,
    tsGeneratedTypesDir: path_1.default.join(__dirname + '/'),
    publish: (socket, dbo) => {
        // if(!socket || !socket._user.admin && !socket._user.id){
        // 	return false;
        // }
        return {
            planes: "*"
        };
    },
    // publishMethods: (socket, dbo: DBObj) => { 
    //     return {
    //         insertPlanes: async (data) => {
    //             // let  tl = Date.now();
    //             let res = await (dbo.planes).insert(data);
    //             // console.log(Date.now() - tl, "ms");
    //             return res;
    //         }
    //     }
    // },
    onReady: (dbo) => __awaiter(void 0, void 0, void 0, function* () {
        let plane = yield dboo.planes.findOne();
        app.get('/', (req, res) => {
            res.sendFile(path_1.default.join(__dirname + '/home.html'));
        });
        app.get('*', function (req, res) {
            res.status(404).send('Page not found');
        });
    }),
});
//# sourceMappingURL=index.js.map