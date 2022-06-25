/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Stefan L. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as promise from "bluebird";
import * as pgPromise from 'pg-promise';
import pg = require('pg-promise/typescript/pg-subset');
import FileManager, { ImageOptions, LocalConfig, S3Config } from "./FileManager";

const pkgj = require('../package.json');
const version = pkgj.version;
import AuthHandler, { ClientInfo, Auth } from "./AuthHandler";
console.log("Add a basic auth mode where user and sessions table are created");

import TableConfigurator, { TableConfig } from "./TableConfig";

import { get } from "./utils";
import { DboBuilder, DBHandlerServer, isPlainObject, LocalParams, TableSchema, PRGLIOSocket } from "./DboBuilder";
import { PubSubManager, DEFAULT_SYNC_BATCH_SIZE, asValue } from "./PubSubManager";
export { DBHandlerServer }
export type PGP = pgPromise.IMain<{}, pg.IClient>;

import { SQLRequest, TableSchemaForClient, CHANNELS, AnyObject, ClientSchema, getKeys, DBSchemaTable, DBSchema } from "prostgles-types";
import { Publish, PublishMethods, PublishParams, PublishParser } from "./PublishParser";
import { DBEventsManager } from "./DBEventsManager";

export type DB = pgPromise.IDatabase<{}, pg.IClient>;
type DbConnection = string | pg.IConnectionParameters<pg.IClient>;
type DbConnectionOpts = pg.IDefaults;
export const TABLE_METHODS = ["update", "find", "findOne", "insert", "delete", "upsert"] as const;
function getDbConnection(dbConnection: DbConnection, options: DbConnectionOpts | undefined, debugQueries = false, onNotice: ProstglesInitOptions["onNotice"]): { db: DB, pgp: PGP } {
    let pgp: PGP = pgPromise({
        
        promiseLib: promise,
        ...(debugQueries? {
            query: function (e) { 
                console.log({psql: e.query, params: e.params}); 
            },
        } : {}),
        ...((onNotice || debugQueries)? {
            connect: function (client, dc, isFresh) {
                if (isFresh && !client.listeners('notice').length) {
                    client.on('notice', function (msg) {
                        if(onNotice){
                            onNotice(msg, get(msg, "message"));
                        } else {
                            console.log("notice: %j", get(msg, "message"));
                        }
                    });
                }
                if (isFresh && !client.listeners('error').length) {
                    client.on('error', function (msg) {
                        if(onNotice){
                            onNotice(msg, get(msg, "message"));
                        } else {
                            console.log("error: %j", get(msg, "message"));
                        }
                    });
                }
            },
        } : {})
    });
    pgp.pg.defaults.max = 70;

    // /* Casts count/sum/max to bigint. Needs rework to remove casting "+count" and other issues; */
    // pgp.pg.types.setTypeParser(20, BigInt);

    if(options){
        Object.assign(pgp.pg.defaults, options);
    }
    
    return { 
        db: pgp(dbConnection), 
        pgp 
    };
}

export const JOIN_TYPES = ["one-many", "many-one", "one-one", "many-many"] as const;
export type Join = {
    tables: [string, string];
    on: { [key: string]: string };
    type: typeof JOIN_TYPES[number];
};
export type Joins = Join[] | "inferred";



type Keywords = {
    $and: string;
    $or: string;
    $not: string;
};

export type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
};
// export type I18N_CONFIG<LANG_IDS = { en: 1, fr: 1 }> = {
//     fallbackLang: keyof LANG_IDS;
//     column_labels?: DeepPartial<{
//         [table_name: string]: {
//             [column_name: string]: {
//                 [lang_id in keyof LANG_IDS]: string
//             }
//         }
//     }>;
// }

type ExpressApp = {
    get: (
        routePath: string, 
        cb: (
            req: { 
                params: { name: string },
                cookies: { sid: string }
            },
            res: {
                redirect: (redirectUrl: string) => any;
                contentType: (type: string) => void;
                sendFile: (fileName: string, opts?: { root: string }) => any;
                status: (code: number) => {
                    json: (response: AnyObject) => any;
                }
            }
        ) => any
    ) => any
};

/**
 * Allows uploading and downloading files.
 * Currently supports only S3.
 * 
 * @description
 * Will create a media table that contains file metadata and urls
 * Inserting a file into this table through prostgles will upload it to S3 and insert the relevant metadata into the media table
 * Requesting a file from HTTP GET {fileUrlPath}/{fileId} will:
 *  1. check auth (if provided) 
 *  2. check the permissions in publish (if provided)
 *  3. redirect the request to the signed url (if allowed)
 * 
 * Specifying referencedTables will:
 *  1. create a column in that table called media
 *  2. create a lookup table lookup_media_{referencedTable} that joins referencedTable to the media table 
 */
export type FileTableConfig = {
    tableName?: string; /* defaults to 'media' */

    /**
     * GET path used in serving media. defaults to /${tableName}
     */
    fileServeRoute?: string;

    awsS3Config?: S3Config;
    localConfig?: LocalConfig;
    //  {
    //     region: string; 
    //     bucket: string; 
    //     accessKeyId: string;
    //     secretAccessKey: string;
    // },
    expressApp: ExpressApp;
    referencedTables?: {
        [tableName: string]: "one" | "many"
    },
    imageOptions?: ImageOptions
};

export type ProstglesInitOptions<S = void> = {
    dbConnection: DbConnection;
    dbOptions?: DbConnectionOpts;
    tsGeneratedTypesDir?: string;
    io?: any;
    publish?: Publish<S>;
    publishMethods?: PublishMethods<S>;
    publishRawSQL?(params: PublishParams<S>): ( (boolean | "*") | Promise<(boolean | "*")>);
    joins?: Joins;
    schema?: string;
    sqlFilePath?: string;
    onReady(dbo: DBOFullyTyped<S>, db: DB): void;
    transactions?: string | boolean;
    wsChannelNamePrefix?: string;
    onSocketConnect?(socket: PRGLIOSocket, dbo: DBOFullyTyped<S>, db?: DB): any;
    onSocketDisconnect?(socket: PRGLIOSocket, dbo: DBOFullyTyped<S>, db?: DB): any;
    auth?: Auth<S>;
    DEBUG_MODE?: boolean;
    watchSchemaType?: 

    /**
     * Will check client queries for schema changes
     * Default
     */
    | "events" 

    /**
     * Will set database event trigger for schema changes. Requires superuser
     */
    | "queries";
    
    watchSchema?: 

        /**
         * If true then DBoGenerated.d.ts will be updated and "onReady" will be called with new schema on both client and server
         */
        | boolean 

        /**
         * "hotReloadMode" will only rewrite the DBoGenerated.d.ts found in tsGeneratedTypesDir
         * This is meant to be used in development when server restarts on file change
         */
        | "hotReloadMode" 

        /**
         * Function called when schema changes. Nothing else triggered
         */
        | ((event: { command: string; query: string }) => void) 

        /**
         * Schema checked for changes every 'checkIntervalMillis" milliseconds
         */
        | { checkIntervalMillis: number };
    keywords?: Keywords;
    onNotice?: (notice: AnyObject, message?: string) => void;
    fileTable?: FileTableConfig;
    tableConfig?: TableConfig;
}

/*
    1. Connect to db
    2. Execute any SQL file if provided
    3. Make DBO object from all tables and views
    4. Set publish listeners
    5. Finish init and provide DBO object
*/

export type OnReady = {
    dbo: DBHandlerServer;
    db: DB;
}

const DEFAULT_KEYWORDS = {
    $filter: "$filter",
    $and: "$and",
    $or: "$or",
    $not: "$not"
};

import * as fs from 'fs';
import { DBOFullyTyped } from "./DBSchemaBuilder";
export class Prostgles {

    opts: ProstglesInitOptions = {
        DEBUG_MODE: false,
        dbConnection: {
            host: "localhost",
            port: 5432,
            application_name: "prostgles_app"
        },
        onReady: () => {},
        schema: "public",
        watchSchema: false,
        watchSchemaType: "queries",
    };

    // dbConnection: DbConnection = {
    //     host: "localhost",
    //     port: 5432,
    //     application_name: "prostgles_app"
    // };
    // dbOptions: DbConnectionOpts;
    db?: DB;
    pgp?: PGP;
    dbo?: DBHandlerServer;
    _dboBuilder?: DboBuilder;
    get dboBuilder(): DboBuilder {
        if(!this._dboBuilder) throw "get dboBuilder: it's undefined"
        return this._dboBuilder;
    }
    set dboBuilder(d: DboBuilder) {
        this._dboBuilder = d;
    }
    publishParser?: PublishParser;

    authHandler?: AuthHandler;


    keywords = DEFAULT_KEYWORDS;
    private loaded = false;

    dbEventsManager?: DBEventsManager;


    fileManager?: FileManager;

    tableConfigurator?: TableConfigurator;

    isMedia(tableName: string){
        return this.opts?.fileTable?.tableName === tableName;
    }

    constructor(params: ProstglesInitOptions){
        if(!params) throw "ProstglesInitOptions missing";
        if(!params.io) console.warn("io missing. WebSockets will not be set up");
        
        // TODO: find an exact keyof T<->arr TS matching method
        let config: Array<keyof ProstglesInitOptions> = [
            "transactions", "joins", "tsGeneratedTypesDir",
            "onReady", "dbConnection", "dbOptions", "publishMethods", "io", 
            "publish", "schema", "publishRawSQL", "wsChannelNamePrefix", "onSocketConnect", 
            "onSocketDisconnect", "sqlFilePath", "auth", "DEBUG_MODE", "watchSchema", "watchSchemaType",
            "fileTable", "tableConfig"
        ];
        const unknownParams = Object.keys(params).filter((key: string) => !(config as string[]).includes(key))
        if(unknownParams.length){ 
            console.error(`Unrecognised ProstglesInitOptions params: ${unknownParams.join()}`);
        }
        
        Object.assign(this.opts, params);

        /* set defaults */
        if(this.opts?.fileTable){
            this.opts.fileTable.tableName = this.opts?.fileTable?.tableName || "media";
        }
        this.opts.schema = this.opts.schema || "public";

        this.keywords = {
            ...DEFAULT_KEYWORDS,
            ...params.keywords,
        }
    }

    destroyed = false;

    async onSchemaChange(event: { command: string; query: string }){
        const { watchSchema, onReady, tsGeneratedTypesDir } = this.opts;
        if(watchSchema && this.loaded){
            console.log("Schema changed");
            const { query } = event;
            if(typeof query === "string" && query.includes(PubSubManager.EXCLUDE_QUERY_FROM_SCHEMA_WATCH_ID)){
                console.log("Schema change event excluded from triggers due to EXCLUDE_QUERY_FROM_SCHEMA_WATCH_ID");
                return;
            }
            
            if(typeof watchSchema === "function"){
                /* Only call the provided func */
                watchSchema(event);

            } else if(watchSchema === "hotReloadMode") {
                if(tsGeneratedTypesDir) {
                    /* Hot reload integration. Will only touch tsGeneratedTypesDir */
                    console.log("watchSchema: Re-writing TS schema");

                    await this.refreshDBO();
                    this.writeDBSchema(true);
                }

            } else if(watchSchema === true || "checkIntervalMillis" in watchSchema){
                /* Full re-init. Sockets must reconnect */
                console.log("watchSchema: Full re-initialisation")
                this.init(onReady);
            }
        }  
    }

    checkDb(){
        if(!this.db || !this.db.connect) throw "something went wrong getting a db connection";
    }

    getTSFileName(){
        const fileName = "DBoGenerated.d.ts" //`dbo_${this.schema}_types.ts`;
        const fullPath = (this.opts.tsGeneratedTypesDir || "") + fileName;
        return { fileName, fullPath }
    }

    private getFileText(fullPath: string, format = "utf8"): Promise<string>{
        return new Promise((resolve, reject) => {
            fs.readFile(fullPath, 'utf8', function(err, data) {
                if(err) reject(err);
                else resolve(data);
            }); 
        })
    }

    writeDBSchema(force = false){

        if(this.opts.tsGeneratedTypesDir){
            const { fullPath, fileName } = this.getTSFileName();
            const header = `/* This file was generated by Prostgles \n` +
            // `* ${(new Date).toUTCString()} \n` 
            `*/ \n\n `;
            const fileContent = header + this.dboBuilder.tsTypesDefinition;
            fs.readFile(fullPath, 'utf8', function(err, data) {
                if (err || (force || data !== fileContent)) {
                    fs.writeFileSync(fullPath, fileContent);
                    console.log("Prostgles: Created typescript schema definition file: \n " + fileName)
                }
            });                
        } else if(force) {
            console.error("Schema changed. tsGeneratedTypesDir needs to be set to reload server")
        }
    }

    refreshDBO = async () => {
        if(this._dboBuilder) this._dboBuilder.destroy();
        this.dboBuilder = await DboBuilder.create(this as any) as any;
        if(!this.dboBuilder) throw "this.dboBuilder"
        this.dbo = this.dboBuilder.dbo as any;
        return this.dbo;
    }

    isSuperUser = false;
    schema_checkIntervalMillis: any;
    async init(onReady: (dbo: DBOFullyTyped, db: DB) => any): Promise<{
        db: DBOFullyTyped;
        _db: DB;
        pgp: PGP;
        io?: any;
        destroy: () => Promise<boolean>;
    }> {
        this.loaded = false;


        if(this.opts.watchSchema === "hotReloadMode" && !this.opts.tsGeneratedTypesDir) {
            throw "tsGeneratedTypesDir option is needed for watchSchema: hotReloadMode to work ";
        } else if(
            this.opts.watchSchema && 
            typeof this.opts.watchSchema === "object" && 
            "checkIntervalMillis" in this.opts.watchSchema && 
            typeof this.opts.watchSchema.checkIntervalMillis === "number"
        ){

            if(this.schema_checkIntervalMillis){
                clearInterval(this.schema_checkIntervalMillis);
                this.schema_checkIntervalMillis = setInterval(async () => {
                    const dbuilder = await DboBuilder.create(this as any);
                    if(dbuilder.tsTypesDefinition !== this.dboBuilder.tsTypesDefinition){
                        this.refreshDBO();
                        this.init(onReady);
                    }
                }, this.opts.watchSchema.checkIntervalMillis)
            }
        }

        /* 1. Connect to db */
        if(!this.db){
            const { db, pgp } = getDbConnection(this.opts.dbConnection, this.opts.dbOptions, this.opts.DEBUG_MODE, 
                notice => { 
                    if(this.opts.onNotice) this.opts.onNotice(notice);
                    if(this.dbEventsManager){
                        this.dbEventsManager.onNotice(notice)
                    }
                }
            );
            this.db = db;
            this.pgp = pgp;
            this.isSuperUser = await isSuperUser(db);
        }
        this.checkDb();
        const db = this.db!;
        const pgp = this.pgp!;

        /* 2. Execute any SQL file if provided */
        if(this.opts.sqlFilePath){
            await this.runSQLFile(this.opts.sqlFilePath);
        }

        try {

            await this.refreshDBO();
            if(this.opts.tableConfig){
                this.tableConfigurator = new TableConfigurator(this as any);
                try {
                    await this.tableConfigurator.init();
                } catch(e){
                    console.error("TableConfigurator: ",e);
                    throw e;
                }
            }

            /* 3. Make DBO object from all tables and views */
            await this.refreshDBO();
            
            /* Create media table if required */
            if(this.opts.fileTable){
                const { awsS3Config, localConfig, imageOptions } = this.opts.fileTable;
                await this.refreshDBO();
                if(!awsS3Config && !localConfig) throw "fileTable missing param: Must provide awsS3Config OR localConfig";
                //@ts-ignore
                this.fileManager = new FileManager(awsS3Config || localConfig, imageOptions);

                try {
                    await this.fileManager.init(this as any);
                } catch(e){
                    console.error("FileManager: ",e);
                    throw e;
                }
            }
            await this.refreshDBO();


            if(this.opts.publish){

                if(!this.opts.io) console.warn("IO missing. Publish has no effect without io");

                /* 3.9 Check auth config */
                this.authHandler = new AuthHandler(this as any);
                await this.authHandler.init();

                this.publishParser = new PublishParser(this.opts.publish, this.opts.publishMethods, this.opts.publishRawSQL, this.dbo!, this.db, this as any);
                this.dboBuilder.publishParser = this.publishParser;
                
                /* 4. Set publish and auth listeners */
                await this.setSocketEvents();

            } else if(this.opts.auth) throw "Auth config does not work without publish";
            
            // if(this.watchSchema){
            //     if(!(await isSuperUser(db))) throw "Cannot watchSchema without a super user schema. Set watchSchema=false or provide a super user";
            // }

            this.dbEventsManager = new DBEventsManager(db, pgp);
            

            this.writeDBSchema();
            
            /* 5. Finish init and provide DBO object */
            try {
                if(this.destroyed) {
                    console.trace(1)
                }
                onReady(this.dbo as any, this.db);
            } catch(err){
                console.error("Prostgles: Error within onReady: \n", err)
            }

            this.loaded = true;
            return {
                db: this.dbo! as any,
                _db: db,
                pgp,
                io: this.opts.io,
                destroy: async () => {
                    console.log("destroying prgl instance")
                    this.destroyed = true;
                    if(this.opts.io){
                        this.opts.io.on("connection", () => {
                            console.log("Socket connected to destroyed instance")
                        });
                        if(typeof this.opts.io.close === "function"){
                            this.opts.io.close();
                            console.log("this.io.close")
                        }
                    }
                    
                    this.dboBuilder?.destroy();
                    this.dbo = undefined;
                    this.db = undefined;
                    await db.$pool.end();
                    await sleep(1000);
                    return true;
                }
            };
        } catch (e) {
            console.trace(e)
            // @ts-ignore
            throw "init issues: " + e.toString();
        }
    }

    async runSQLFile(filePath: string){
        
        const fileContent = await this.getFileText(filePath);//.then(console.log);

        return this.db?.multi(fileContent).then((data)=>{
            console.log("Prostgles: SQL file executed successfuly \n    -> " + filePath);
            return data
        }).catch((err) => {
            const { position, length } = err,
                lines = fileContent.split("\n");
            let errMsg = filePath + " error: ";
            
            if(position && length && fileContent){
                const startLine = Math.max(0, fileContent.substring(0, position).split("\n").length - 2),
                    endLine = startLine + 3;

                errMsg += "\n\n";
                errMsg += lines.slice(startLine, endLine).map((txt, i) => `${startLine + i + 1} ${i === 1? "->" : "  "} ${txt}`).join("\n");
                errMsg += "\n\n";
            }
            console.error(errMsg, err);
            throw err;
        });
    }


    connectedSockets: any[] = [];
    async setSocketEvents(){
        this.checkDb();

        if(!this.dbo) throw "dbo missing";

        let publishParser = new PublishParser(this.opts.publish, this.opts.publishMethods, this.opts.publishRawSQL, this.dbo, this.db!, this as any);
        this.publishParser = publishParser;

        if(!this.opts.io) return;

        /* Already initialised. Only reconnect sockets */
        if(this.connectedSockets.length){
            this.connectedSockets.forEach((s: any) => {
                s.emit(CHANNELS.SCHEMA_CHANGED);
                this.pushSocketSchema(s);
            });
            return;
        }
        
        /* Initialise */
        this.opts.io.on('connection', async (socket: PRGLIOSocket) => {
            if(this.destroyed){
                console.log("Socket connected to destroyed instance");
                socket.disconnect();
                return
            }
            this.connectedSockets.push(socket);

            if(!this.db || !this.dbo) throw "db/dbo missing";
            let { dbo, db, pgp } = this;
            
            try {
                if(this.opts.onSocketConnect) await this.opts.onSocketConnect(socket, dbo as any, db);

                
                /*  RUN Client request from Publish.
                    Checks request against publish and if OK run it with relevant publish functions. Local (server) requests do not check the policy 
                */
                socket.removeAllListeners(CHANNELS.DEFAULT)
                socket.on(CHANNELS.DEFAULT, async ({ tableName, command, param1, param2, param3 }: SocketRequestParams, cb = (...callback: any[]) => {} ) => {
                    
                    try { /* Channel name will only include client-sent params so we ignore table_rules enforced params */
                        if(!socket || !this.authHandler || !this.publishParser || !this.dbo) {
                            console.error("socket or authhandler missing??!!")
                            throw "socket or authhandler missing??!!";
                        }

                        const clientInfo = await this.authHandler.getClientInfo({ socket });
                        let valid_table_command_rules = await this.publishParser.getValidatedRequestRule({ tableName, command, localParams: { socket } }, clientInfo);
                        if(valid_table_command_rules){
                            //@ts-ignore
                            let res = await this.dbo[tableName][command]!(param1, param2, param3, valid_table_command_rules, { socket, has_rules: true }); 
                            cb(null, res);
                        } else throw `Invalid OR disallowed request: ${tableName}.${command} `;
                            
                    } catch(err) {
                        // const _err_msg = err.toString();
                        // cb({ msg: _err_msg, err });
                        console.trace(err);
                        cb(err)
                        // console.warn("runPublishedRequest ERROR: ", err, socket._user);
                    }
                });

                socket.on("disconnect", () => {
                    this.dbEventsManager?.removeNotice(socket);
                    this.dbEventsManager?.removeNotify(undefined, socket);
                    this.connectedSockets = this.connectedSockets.filter(s => s.id !== socket.id);
                    // subscriptions = subscriptions.filter(sub => sub.socket.id !== socket.id);
                    if(this.opts.onSocketDisconnect){
                        this.opts.onSocketDisconnect(socket, dbo as any);
                    };
                });

                socket.removeAllListeners(CHANNELS.METHOD)
                socket.on(CHANNELS.METHOD, async ({ method, params }: SocketMethodRequest, cb = (...callback: any) => {} ) => {
                    try {
                        const methods = await this.publishParser?.getMethods(socket) as any;
                        
                        if(!methods || !methods[method]){
                            cb("Disallowed/missing method " + JSON.stringify(method));
                        } else {
                            try {
                                const res = await methods[method](...params);
                                cb(null, res);
                            } catch(err){
                                makeSocketError(cb, err);
                            }
                        }
                    } catch(err) {
                        makeSocketError(cb, err);
                        console.warn("method ERROR: ", err, socket._user);
                    }
                });
                
                this.pushSocketSchema(socket);
            } catch(e) {
                console.trace("setSocketEvents: ", e)
            }        
        });
    }

    pushSocketSchema = async (socket: any) => {

        let auth: any = await this.authHandler?.makeSocketAuth(socket) || {};
        
        // let needType = this.publishRawSQL && typeof this.publishRawSQL === "function";
        // let DATA_TYPES = !needType? [] : await this.db.any("SELECT oid, typname FROM pg_type");
        // let USER_TABLES = !needType? [] :  await this.db.any("SELECT relid, relname FROM pg_catalog.pg_statio_user_tables");

        const { dbo, db, pgp, publishParser } = this;
        let fullSchema: {
            schema: TableSchemaForClient;
            tables: DBSchemaTable[];
        } | undefined;
        let publishValidationError;
        let rawSQL = false;
        
        try {
            if(!publishParser) throw "publishParser undefined";
            fullSchema = await publishParser.getSchemaFromPublish(socket);
        } catch(e){
            publishValidationError = "Server Error: PUBLISH VALIDATION ERROR";
            console.error(`\nProstgles PUBLISH VALIDATION ERROR (after socket connected):\n    ->`, e);
        }
        socket.prostgles = socket.prostgles || {};
        socket.prostgles.schema = fullSchema?.schema;
        /*  RUN Raw sql from client IF PUBLISHED
        */
       
        if(this.opts.publishRawSQL && typeof this.opts.publishRawSQL === "function"){
            const canRunSQL = async () => {
                const publishParams = await this.publishParser?.getPublishParams({ socket })
                let res = await this.opts.publishRawSQL?.(publishParams as any);
                return Boolean(res && typeof res === "boolean" || res === "*");
            } 

            if(await canRunSQL()){
                socket.removeAllListeners(CHANNELS.SQL)
                socket.on(CHANNELS.SQL, async ({ query, params, options }: SQLRequest, cb = (...callback: any) => {}) => {

                    if(!this.dbo?.sql) throw "Internal error: sql handler missing";

                    this.dbo.sql(query, params, options, { socket }).then(res => {
                        cb(null, res)
                    }).catch(err => {
                        makeSocketError(cb, err);
                    })
                });
                if(db){
                    // let allTablesViews = await db.any(STEP2_GET_ALL_TABLES_AND_COLUMNS);
                    // fullSchema = allTablesViews;
                    rawSQL = true;
                } else console.error("db missing");
            }
        }

        const { schema, tables } = fullSchema ?? { schema: {}, tables: [] };
        let joinTables2: string[][] = [];
        if(this.opts.joins){
            // joinTables = Array.from(new Set(flat(this.dboBuilder.getJoins().map(j => j.tables)).filter(t => schema[t])));
            let _joinTables2 = this.dboBuilder.getJoinPaths()
            .filter(jp => 
                ![jp.t1, jp.t2].find(t => !schema[t] || !schema[t].findOne)
            ).map(jp => [jp.t1, jp.t2].sort());
            _joinTables2.map(jt => {
                if(!joinTables2.find(_jt => _jt.join() === jt.join())){
                    joinTables2.push(jt);
                }
            });
        }
        
        const methods = await publishParser?.getMethods(socket);
        const clientSchema: ClientSchema = {
            schema, 
            methods: getKeys(methods), 
            tableSchema: tables,
            rawSQL,
            joinTables: joinTables2,
            auth,
            version,
            err: publishValidationError
        }
        socket.emit(CHANNELS.SCHEMA, clientSchema);
    }
}
function makeSocketError(cb: Function, err: any){
    const err_msg = (err instanceof Error)? 
    err.toString() : 
        isPlainObject(err)?
        JSON.stringify(err, null, 2) : 
            (err as any).toString(),
        e = { err_msg, err };
    cb(e);
}

type SocketRequestParams = {
    tableName: string;
    command: typeof TABLE_METHODS[number];
    param1: any;
    param2: any;
    param3: any;
}
type SocketMethodRequest = {
    method: string;
    params: any;
}

// const ALL_PUBLISH_METHODS = ["update", "upsert", "delete", "insert", "find", "findOne", "subscribe", "unsubscribe", "sync", "unsync", "remove"];
// const ALL_PUBLISH_METHODS = RULE_TO_METHODS.map(r => r.methods).flat();

// export function flat(arr){
//     // let res = arr.reduce((acc, val) => [ ...acc, ...val ], []);
//     let res =  arr.reduce(function (farr, toFlatten) {
//         return farr.concat(Array.isArray(toFlatten) ? flat(toFlatten) : toFlatten);
//       }, []);
      
//     return res;
// }



export async function isSuperUser(db: DB): Promise<boolean>{
    return db.oneOrNone("select usesuper from pg_user where usename = CURRENT_USER;").then(r => r.usesuper);
}


function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
} 