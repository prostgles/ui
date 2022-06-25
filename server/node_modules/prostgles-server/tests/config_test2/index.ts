

/* Dashboard */
import path from 'path';
import express from 'express';
import prostgles from "prostgles-server";

process.on('unhandledRejection', (reason, p) => {
  console.trace('Unhandled Rejection at:', p, 'reason:', reason)
  process.exit(1)
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const _http = require("http");
const http = _http.createServer(app);
const io = require("socket.io")(http, { 
  path: "/s" 
});
http.listen(process.env.NPORT || 30011);

const log = (msg: string, extra?: any) => {
  console.log(...["(server): " + msg, extra].filter(v => v));
}
console.log(2)

import { DBObj } from "./DBoGenerated";

prostgles({
  dbConnection: {
    host: process.env.POSTGRES_HOST || "localhost",
    port: +process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || "postgres",
    user: process.env.POSTGRES_USER || "api",
    password:  process.env.POSTGRES_PASSWORD || "api",
    application_name: "hehe" + Date.now()
  },
  io,
  tsGeneratedTypesDir: path.join(__dirname + '/'),
  watchSchema: s => {
    // console.log(s.command)
  },// "hotReloadMode",
	sqlFilePath: path.join(__dirname+'/init.sql'),
  // transactions: true,	
  joins: "inferred",
  publishRawSQL: async (socket, db: any, _db: any, user: any) => {
    // log("set auth logic")
    return true
  },
  publish: async (socket, dbo: any, _db: any, user: any) => {
     
    return {
      various: "*",

    };
    
  },
  onReady: async (db: DBObj, _db: any) => {
    // await _db.any("CREATE TABLE IF NOT EXISTS ttt(id INTEGER, t TEXT)");

    // console.log(await db.various.find({ "id.<": 1423 }) )
    // db.various.subscribe({ "id.<": 1423 }, {}, console.log)
    // console.log(await db.lookup_status.getJoinedTables())
  },
});
 