"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const prostgles_server_1 = __importDefault(require("prostgles-server"));
const app = (0, express_1.default)();
const http = require('http').createServer(app);
const { exec } = require('child_process');
const clientTest = (process.env.TEST_TYPE === "client");
const io = !clientTest ? undefined : require("socket.io")(http, { path: "/teztz/s" });
http.listen(3001);
const isomorphic_queries_1 = __importDefault(require("../isomorphic_queries"));
const server_only_queries_1 = __importDefault(require("../server_only_queries"));
const log = (msg, extra, trace) => {
    const msgs = ["(server): " + msg, extra].filter(v => v);
    if (trace) {
        console.trace(...msgs);
    }
    else {
        console.log(...msgs);
    }
};
const stopTest = (err) => {
    log("Stopping server ...");
    if (err) {
        console.trace(err);
    }
    process.exit(err ? 1 : 0);
};
const sessions = [];
const users = [{ id: "1a", username: "john", password: "secret" }];
process.on('unhandledRejection', (reason, p) => {
    console.trace('Unhandled Rejection at:', p, 'reason:', reason);
    process.exit(1);
});
const dbConnection = {
    host: process.env.POSTGRES_HOST || "localhost",
    port: +process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || "postgres",
    user: process.env.POSTGRES_USER || "api",
    password: process.env.POSTGRES_PASSWORD || "api",
    // user: "usr",
    // password:  "usr",
};
function dd() {
    const dbo = 1;
    if (!dbo)
        return;
    dbo.tbl.find;
}
(async () => {
    log("created prostgles");
    const tableConfig = {
        tr2: {
            columns: {
                t1: { label: { fr: "fr_t1" }, info: { hint: "hint...", min: "a", max: "b" } },
                t2: { label: { en: "en_t2" } },
            }
        },
        lookup_col1: {
            dropIfExists: true,
            isLookupTable: {
                values: {
                    a: {},
                    b: {}
                },
            }
        },
        uuid_text: {
            columns: {
                col1: {
                    references: {
                        tableName: "lookup_col1",
                        nullable: true,
                    }
                },
                col2: {
                    references: {
                        tableName: "lookup_col1",
                        nullable: true,
                    }
                }
            }
        }
    };
    // ProstglesInitOptions<DBSchemaGenerated>
    let prgl = await (0, prostgles_server_1.default)({
        dbConnection,
        sqlFilePath: path_1.default.join(__dirname + '/init.sql'),
        io,
        tsGeneratedTypesDir: path_1.default.join(__dirname + '/'),
        // watchSchema: true,
        transactions: true,
        // DEBUG_MODE: true,
        // onNotice: console.log,
        tableConfig,
        fileTable: {
            // awsS3Config: {
            //   accessKeyId: process.env.S3_KEY,
            //   bucket: process.env.S3_BUCKET,
            //   region: process.env.S3_REGION,
            //   secretAccessKey: process.env.S3_SECRET,
            // },
            referencedTables: {
                items_with_one_media: "one",
                items_with_media: "many",
            },
            localConfig: {
                localFolderPath: path_1.default.join(__dirname + '/media'),
            },
            expressApp: app,
        },
        onSocketDisconnect: (socket, db) => {
            log("onSocketDisconnect");
            console.trace("onSocketDisconnect");
            // const c: DBOFullyTyped<DBSchemaGenerated> = 1 as any;
            // c["*"].
        },
        onSocketConnect: (socket, db) => {
            log("onSocketConnect");
            if (clientTest) {
                log("Client connected -> CLIENT ERRORS ARE NOT LOGGED HERE!");
                socket.emit("start-test", { server_id: Math.random() });
                socket.on("stop-test", async (err, cb) => {
                    cb();
                    if (!err) {
                        console.log("Client test successful!");
                    }
                    // console.log("Destroying prgl");
                    // await db.items.subscribe({}, {}, () => {});
                    // await prgl.destroy();
                    // console.log("Recreating prgl")
                    // prgl = await prostgles({
                    // 	dbConnection,
                    // 	onReady: async (dbo) => {
                    // 		console.warn("onReady", await dbo.items.count())
                    // 		// await tout(2)
                    // 		await prgl.destroy();
                    // 		console.log("Recreating prgl")
                    // 		prgl = await prostgles({
                    // 			dbConnection,
                    // 			onReady: async (dbo) => {
                    // 				console.warn("onReady", await dbo.items.count())
                    // 			}
                    // 		});
                    // 	}
                    // });
                    stopTest(err);
                });
            }
            return true;
        },
        // DEBUG_MODE: true,
        publishRawSQL: async (params) => {
            return true; // Boolean(user && user.type === "admin")
        },
        auth: {
            sidKeyName: "token",
            getUser: async (sid) => {
                if (sid) {
                    const s = sessions.find(s => s.id === sid);
                    if (s) {
                        const user = users.find(u => s && s.user_id === u.id);
                        if (user) {
                            return { user, clientUser: { sid: s.id, uid: user.id } };
                        }
                    }
                }
                return undefined;
            },
            login: async ({ username, password } = {}) => {
                const u = users.find(u => u.username === username && u.password === password);
                if (!u)
                    throw "something went wrong: " + JSON.stringify({ username, password });
                let s = sessions.find(s => s.user_id === u.id);
                if (!s) {
                    s = { id: "SID" + Date.now(), user_id: u.id };
                    sessions.push(s);
                }
                log("Logged in!");
                return { sid: s.id, expires: Infinity };
            },
            cacheSession: {
                getSession: async (sid) => {
                    const s = sessions.find(s => s.id === sid);
                    return s ? { sid: s.id, expires: Infinity } : undefined;
                }
            }
        },
        publishMethods: async (params) => {
            return {
                get: () => 222
            };
        },
        publish: async ({ user }) => {
            const res = {
                shapes: "*",
                items: "*",
                items2: "*",
                items3: "*",
                v_items: "*",
                various: "*",
                tr1: "*",
                tr2: "*",
                planes: {
                    select: "*",
                    update: "*",
                    insert: "*",
                    delete: "*",
                    sync: {
                        id_fields: ["id"],
                        synced_field: "last_updated"
                    }
                },
                items4: {
                    select: user ? "*" : {
                        fields: { name: 0 },
                        forcedFilter: { name: "abc" }
                    },
                    insert: "*",
                    update: "*",
                    delete: "*"
                },
                items4_pub: "*",
                "*": {
                    select: { fields: { "*": 0 } },
                    insert: "*",
                    update: "*",
                },
                [`"*"`]: {
                    select: { fields: { [`"*"`]: 0 } },
                    insert: "*",
                    update: "*",
                },
                obj_table: "*",
                media: "*",
                items_with_one_media: "*",
                items_with_media: "*",
                prostgles_lookup_media_items_with_one_media: "*",
                prostgles_lookup_media_items_with_media: "*",
                insert_rules: {
                    insert: {
                        fields: "*",
                        returningFields: { name: 1 },
                        validate: async (row) => {
                            if (row.name === "a")
                                row.name = "b";
                            return row;
                        }
                    }
                },
                uuid_text: {
                    insert: {
                        fields: "*",
                        forcedData: {
                            id: 'c81089e1-c4c1-45d7-a73d-e2d613cb7c3e'
                        }
                    },
                    update: {
                        fields: [],
                        dynamicFields: [{
                                fields: { id: 1 },
                                filter: {
                                    id: 'c81089e1-c4c1-45d7-a73d-e2d613cb7c3e'
                                }
                            }]
                    }
                }
            };
            return res;
        },
        // joins: "inferred",
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
        onReady: async (db, _db) => {
            log("prostgles onReady");
            app.get('*', function (req, res) {
                log(req.originalUrl);
                res.sendFile(path_1.default.join(__dirname + '/index.html'));
            });
            try {
                if (process.env.TEST_TYPE === "client") {
                    const clientPath = `cd ${__dirname}/../client && npm test`;
                    log("EXEC CLIENT PROCESS");
                    const proc = exec(clientPath, console.log);
                    log("Waiting for client...");
                    proc.stdout.on('data', function (data) {
                        console.log(data);
                    });
                    proc.stderr.on('data', function (data) {
                        console.error(data);
                    });
                }
                else if (process.env.TEST_TYPE === "server") {
                    await (0, isomorphic_queries_1.default)(db);
                    log("Server isomorphic tests successful");
                    await (0, server_only_queries_1.default)(db);
                    log("Server-only query tests successful");
                    stopTest();
                }
                else {
                    // await db.items4.delete();
                    // await db.items4.insert([
                    // 	{ name: "abc", public: "public data", added: new Date('04 Dec 1995 00:12:00 GMT') },
                    // 	{ name: "abc", public: "public data", added: new Date('04 Dec 1995 00:12:00 GMT') },
                    // 	{ name: "abcd", public: "public data d", added: new Date('04 Dec 1996 00:12:00 GMT') }
                    // ]);
                    // const v1 = await db.items.insert([{ name: "a" }, { name: "z" }, { name: "b" }]);
                    // await db.items2.insert([{ name: "a", items_id: 1 }]);
                    // await db.items2.insert([{ name: "a", items_id: 1 }]);
                    // await db.items2.insert([{ name: "b", items_id: 2 }]);
                    // await db.items2.insert([{ name: "b", items_id: 2 }]);
                    // await db.items2.insert([{ name: "b", items_id: 2 }]);
                    // await db.items3.insert([{ name: "a" }, { name: "za123" }]);
                    // const MonAgg = await db.items.find({}, { select: { 
                    // 	name: 1,
                    // 	items2: { count: { $count: ["id"] } } ,
                    // } });
                    // console.log(JSON.stringify(MonAgg, null, 2));
                    // await _db.any("DROP TABLE IF EXISTS tt; ")
                    // await _db.any("DROP TABLE IF EXISTS tt; CREATE TABLE tt(id serial);")
                    // await _db.any("DROP EXTENSION IF EXISTS pgcrypto; CREATE EXTENSION pgcrypto;")
                    // console.log(await db.items4.findOne({}, { select: { public: { "$ts_headline": ["public", "public"] } } }))
                }
            }
            catch (err) {
                console.trace(err);
                if (process.env.TEST_TYPE) {
                    stopTest(err);
                }
            }
        },
    });
})();
function randElem(items) {
    return items[Math.floor(Math.random() * items.length)];
}
async function tout(millis) {
    return new Promise((re, rj) => {
        setTimeout(() => {
            re(true);
        }, millis);
    });
}
