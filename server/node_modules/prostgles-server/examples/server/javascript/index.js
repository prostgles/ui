const express = require('express');
const app = express();
const path = require('path');
const { join } = require('path');
var http = require('http').createServer(app);
var io = require('socket.io')(http);
http.listen(3001);

const prostgles = require('prostgles-server');

prostgles({
	dbConnection: {
		host: "localhost",
		port: "5432",
    user: process.env.PRGL_USER,
    password: process.env.PRGL_PWD
	},

	// Optional sql file to be run on each reload
	sqlFilePath: path.join(__dirname+'/init.sql'),

	publish: () => "*",
	io,
	onReady: async (db, _db) => {

	},
});