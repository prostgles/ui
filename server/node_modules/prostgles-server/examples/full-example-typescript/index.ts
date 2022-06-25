import express from 'express';
const app = express();
import path from 'path';
var http = require('http').createServer(app);
var io = require("socket.io")(http);
http.listen(30009);
import prostgles from "prostgles-server"

import { DBObj } from "./DBoGenerated";


prostgles({
    dbConnection: {
        host: "localhost",
        port: 5432,
        database: "example",
        user: process.env.PRGL_USER,
        password: process.env.PRGL_PWD
    },
    
    sqlFilePath: path.join(__dirname+'/init.sql'),
    io,
    tsGeneratedTypesDir: path.join(__dirname + '/'),
	publish: () => {

        return {
            planes: "*"
        }
    },
    publishMethods: ({ dbo }) => { 
        return {
            insertPlanes: async (data) => {
                // let  tl = Date.now();
                let res = await (dbo.planes).insert(data);
                // console.log(Date.now() - tl, "ms");
                return res;
            }
        }
    },
    
    onReady: async (dbo: DBObj) => {

        let plane = await dbo.planes.findOne();
        
        
		app.get('/', (req, res) => {
			res.sendFile(path.join(__dirname+'/home.html'));
        });
        
        app.get('*', function(req, res){
			res.status(404).send('Page not found');
		});
    },
});