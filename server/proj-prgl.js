const prostgles = require("prostgles-server");
const path = require("path");
const express = require("express");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add headers before the routes are defined
app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3004");

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE",
  );

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type",
  );

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);

  // Pass to next layer of middleware
  next();
});

const _http = require("http");
const http = _http.createServer(app);

const {
  app_port,
  db_conn,
  db_host,
  db_port,
  db_name,
  db_user,
  db_pass,
  socket_path = "/iosckt",
} = process.env;

console.log(
  process.env,
  JSON.stringify({
    app_port,
    db_conn,
    db_host,
    db_port,
    db_name,
    db_user,
    db_pass,
    socket_path,
  }),
);

const { Server } = require("socket.io");
const io = new Server(http, { path: socket_path });

http.listen(app_port);

prostgles({
  dbConnection:
    db_conn ?
      { connectionString: db_conn }
    : {
        host: db_host,
        port: db_port,
        database: db_name,
        user: db_user,
        password: db_pass,
      },
  io,
  watchSchema: true,

  // DEBUG_MODE: true,

  joins: "inferred",
  publish: "*",
  publishRawSQL: () => "*",
  onSocketConnect: () => {
    console.log("onSocketConnect");
  },
  onReady: (db, _db) => {
    console.log("onReady", Object.keys(db));
  },
});
