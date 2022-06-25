

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
  path: "/teztz/s",
  // maxHttpBufferSize: 1e8, // 100Mb
});
http.listen(process.env.NPORT || 3000);

const log = (msg: string, extra?: any) => {
  console.log(...["(server): " + msg, extra].filter(v => v));
}


import { DBObj } from "./DBoGenerated";


// import WebSocket from 'ws';
// const wss = new WebSocket.Server({
//   // port: 3001,
//   server: http,
//   path: "/s",
//   perMessageDeflate: {
//     zlibDeflateOptions: {
//       // See zlib defaults.
//       chunkSize: 1024,
//       memLevel: 7,
//       level: 3
//     },
//     zlibInflateOptions: {
//       chunkSize: 10 * 1024
//     },
//     // Other options settable:
//     clientNoContextTakeover: true, // Defaults to negotiated value.
//     serverNoContextTakeover: true, // Defaults to negotiated value.
//     serverMaxWindowBits: 10, // Defaults to negotiated value.
//     // Below options specified as default values.
//     concurrencyLimit: 10, // Limits zlib concurrency for perf.
//     threshold: 1024 // Size (in bytes) below which messages
//     // should not be compressed.
//   }
// });
// wss.on("connection", s => {
//   s.on("message", console.log)
// })

prostgles<DBObj>({
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
  // watchSchema: true,// "hotReloadMode",
	sqlFilePath: path.join(__dirname+'/init.sql'),
  // transactions: true,	
  publishRawSQL: async (params) => {
    // log("set auth logic")
    return true
  },
  // publish: "*",
   publish: async (params) => {
    return {
      items_with_one_media: {
        insert: "*"
      },
      media: "*",
      uuid_text: {
        insert: {
          fields: "*",
          forcedData: {
            id: 'c81089e1-c4c1-45d7-a73d-e2d613cb7c3e'
          }
        }
      }
      // v_various: "*",
    };
    
  },
  joins: "inferred",
	// onNotice: console.log,
  fileTable: {
    // awsS3Config: {   
    //   accessKeyId: process.env.S3_KEY,
    //   bucket: process.env.S3_BUCKET,
    //   region: process.env.S3_REGION,
    //   secretAccessKey: process.env.S3_SECRET,
    // },
    localConfig: {
      localFolderPath: path.join(__dirname+'/media'),
    },
    expressApp: app,
    referencedTables: {
      various: "one",
      items_m1: "many",
      items_with_one_media: "one",
      items_with_media: "one",
      skills: "many",
    }
  },
  transactions: true,
  tableConfig: {
    uuid_text: {
      columns: {
        name: {
          info: {
            min: 1,
            max: 3,
            hint: "hiint"
          }
        }
      }
    }
  },
  onReady: async (db, _db: any) => {
    
    // console.log("onReady", Object.keys(db))
    
    app.get('*', function(req, res){
      log(req.originalUrl)
			res.sendFile(path.join(__dirname+'/index.html'));
		});

    // console.log(JSON.stringify({
    //   various: await db.various?.find(),
    //   prostgles_lookup_media_various: await db.prostgles_lookup_media_various?.find(),
    //   media: await db.media?.find()
    // }, null, 2))

    setTimeout(async () => {
      // (db as any).tx(async t => {
      //   await t.various.insert({ media })
      // })

      try {
        // const res = await db.various.insert({ media }, {returning: "*"})
        // console.log(res)
        // console.log(await db.various_nested.insert({ various: {} }, {returning: "*"}))
        // console.log(await db.various.insert({ various_nested: {} }, {returning: "*"}))


        // let str = "This is a string",
        //   data = Buffer.from(str, "utf-8"),
        //   mediaFile = { data, name: "sample_file.txt" }

        // const file = await db.media.insert(mediaFile, { returning: "*" });
   
        // await db.items_with_one_media.delete();
        // await db.media.delete();
        // const items_with_one_media = await db.items_m1.insert({ name: "items_m1", items_with_one_media: [{ name: "sample_file.txt", media: [mediaFile] }]}, { returning: "*" });
        // console.log(await await db.items_m1.find())
        // console.log(await await db.items_with_one_media.find())
        // console.log(await await db.media.find());
 
        // throw items_with_one_media;

        console.log(await db.uuid_text.getColumns())

      } catch(e){
        console.error(e)
      } 
 
    }, 2000)

    // db.media.insert({
    //   name: "hehe.txt",
    //   data: Buffer.from("str", "utf-8")
    // })

    try {
 
    } catch(e) {
      console.error(e)
    }
  },
});
