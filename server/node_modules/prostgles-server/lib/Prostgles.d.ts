import * as pgPromise from 'pg-promise';
import pg = require('pg-promise/typescript/pg-subset');
import FileManager, { ImageOptions, LocalConfig, S3Config } from "./FileManager";
import AuthHandler, { Auth } from "./AuthHandler";
import TableConfigurator, { TableConfig } from "./TableConfig";
import { DboBuilder, DBHandlerServer, PRGLIOSocket } from "./DboBuilder";
export { DBHandlerServer };
export declare type PGP = pgPromise.IMain<{}, pg.IClient>;
import { AnyObject } from "prostgles-types";
import { Publish, PublishMethods, PublishParams, PublishParser } from "./PublishParser";
import { DBEventsManager } from "./DBEventsManager";
export declare type DB = pgPromise.IDatabase<{}, pg.IClient>;
declare type DbConnection = string | pg.IConnectionParameters<pg.IClient>;
declare type DbConnectionOpts = pg.IDefaults;
export declare const TABLE_METHODS: readonly ["update", "find", "findOne", "insert", "delete", "upsert"];
export declare const JOIN_TYPES: readonly ["one-many", "many-one", "one-one", "many-many"];
export declare type Join = {
    tables: [string, string];
    on: {
        [key: string]: string;
    };
    type: typeof JOIN_TYPES[number];
};
export declare type Joins = Join[] | "inferred";
declare type Keywords = {
    $and: string;
    $or: string;
    $not: string;
};
export declare type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
};
declare type ExpressApp = {
    get: (routePath: string, cb: (req: {
        params: {
            name: string;
        };
        cookies: {
            sid: string;
        };
    }, res: {
        redirect: (redirectUrl: string) => any;
        contentType: (type: string) => void;
        sendFile: (fileName: string, opts?: {
            root: string;
        }) => any;
        status: (code: number) => {
            json: (response: AnyObject) => any;
        };
    }) => any) => any;
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
export declare type FileTableConfig = {
    tableName?: string;
    /**
     * GET path used in serving media. defaults to /${tableName}
     */
    fileServeRoute?: string;
    awsS3Config?: S3Config;
    localConfig?: LocalConfig;
    expressApp: ExpressApp;
    referencedTables?: {
        [tableName: string]: "one" | "many";
    };
    imageOptions?: ImageOptions;
};
export declare type ProstglesInitOptions<S = void> = {
    dbConnection: DbConnection;
    dbOptions?: DbConnectionOpts;
    tsGeneratedTypesDir?: string;
    io?: any;
    publish?: Publish<S>;
    publishMethods?: PublishMethods<S>;
    publishRawSQL?(params: PublishParams<S>): ((boolean | "*") | Promise<(boolean | "*")>);
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
    "events"
    /**
     * Will set database event trigger for schema changes. Requires superuser
     */
     | "queries";
    watchSchema?: 
    /**
     * If true then DBoGenerated.d.ts will be updated and "onReady" will be called with new schema on both client and server
     */
    boolean
    /**
     * "hotReloadMode" will only rewrite the DBoGenerated.d.ts found in tsGeneratedTypesDir
     * This is meant to be used in development when server restarts on file change
     */
     | "hotReloadMode"
    /**
     * Function called when schema changes. Nothing else triggered
     */
     | ((event: {
        command: string;
        query: string;
    }) => void)
    /**
     * Schema checked for changes every 'checkIntervalMillis" milliseconds
     */
     | {
        checkIntervalMillis: number;
    };
    keywords?: Keywords;
    onNotice?: (notice: AnyObject, message?: string) => void;
    fileTable?: FileTableConfig;
    tableConfig?: TableConfig;
};
export declare type OnReady = {
    dbo: DBHandlerServer;
    db: DB;
};
import { DBOFullyTyped } from "./DBSchemaBuilder";
export declare class Prostgles {
    opts: ProstglesInitOptions;
    db?: DB;
    pgp?: PGP;
    dbo?: DBHandlerServer;
    _dboBuilder?: DboBuilder;
    get dboBuilder(): DboBuilder;
    set dboBuilder(d: DboBuilder);
    publishParser?: PublishParser;
    authHandler?: AuthHandler;
    keywords: {
        $filter: string;
        $and: string;
        $or: string;
        $not: string;
    };
    private loaded;
    dbEventsManager?: DBEventsManager;
    fileManager?: FileManager;
    tableConfigurator?: TableConfigurator;
    isMedia(tableName: string): boolean;
    constructor(params: ProstglesInitOptions);
    destroyed: boolean;
    onSchemaChange(event: {
        command: string;
        query: string;
    }): Promise<void>;
    checkDb(): void;
    getTSFileName(): {
        fileName: string;
        fullPath: string;
    };
    private getFileText;
    writeDBSchema(force?: boolean): void;
    refreshDBO: () => Promise<DBHandlerServer>;
    isSuperUser: boolean;
    schema_checkIntervalMillis: any;
    init(onReady: (dbo: DBOFullyTyped, db: DB) => any): Promise<{
        db: DBOFullyTyped;
        _db: DB;
        pgp: PGP;
        io?: any;
        destroy: () => Promise<boolean>;
    }>;
    runSQLFile(filePath: string): Promise<any[][]>;
    connectedSockets: any[];
    setSocketEvents(): Promise<void>;
    pushSocketSchema: (socket: any) => Promise<void>;
}
export declare function isSuperUser(db: DB): Promise<boolean>;
//# sourceMappingURL=Prostgles.d.ts.map