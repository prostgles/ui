const express = require('express');
const app = express();
const path = require('path');
var http = require('http').createServer(app);
var io = require('socket.io')(http, { path: "/s" });
http.listen(3001);

let prostgles = require('prostgles-server');


prostgles({
    dbConnection: {
        host: "localhost",
        port: "5432",
        user: process.env.PRGL_USER,
        password: process.env.PRGL_PWD
    },
    dbOptions: {
        application_name: "prostgles_api",
        max: 100,
        poolIdleTimeout: 10000
    },
    sqlFilePath: path.join(__dirname+'/init.sql'),
    
    io,
    
    onReady: async () => {
        app.get('*', function(req, res){
            console.log(req.originalUrl)
			res.sendFile(path.join(__dirname+'/home.html'));
		});
    },

	publish: () => {
        return {
            
            Points: {
                select: "*",
                insert: "*",
                update: "*",
                delete: "*",
                sync: {
                    synced_field: "Synced",
                    id_fields: ["id"]
                }
            },
            lines: {
                select: "*",
                insert: "*",
                update: "*",
                delete: "*",
                sync: {
                    synced_field: "Synced",
                    id_fields: ["id"]
                }
            }
        }
    },
});