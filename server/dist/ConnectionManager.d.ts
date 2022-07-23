import { PRGLIOSocket } from "prostgles-server/dist/DboBuilder";
import { Connections } from "./index";
import { DBSchemaGenerated } from "./DBoGenerated";
import prostgles from "prostgles-server";
import { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import { DB, FileTableConfig } from "prostgles-server/dist/Prostgles";
export declare type Unpromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never;
export declare type ConnectionTableConfig = Pick<FileTableConfig, "referencedTables"> & {
    fileTable?: string;
    storageType?: {
        type: "local";
    } | {
        type: "S3";
        accessKeyId?: string;
        bucket?: string;
        region?: string;
        secretAccessKey?: string;
    };
};
declare type PRGLInstance = {
    socket_path: string;
    con: Connections;
    prgl?: Unpromise<ReturnType<typeof prostgles>>;
    error?: any;
};
import WebSocket from 'ws';
export declare class ConnectionManager {
    prgl_connections: Record<string, PRGLInstance>;
    http: any;
    app: any;
    wss?: WebSocket.Server<WebSocket.WebSocket>;
    constructor(http: any, app: any);
    setUpWSS(): WebSocket.Server<WebSocket.WebSocket>;
    getFileFolderPath(conId?: string): string;
    getConnection(conId: string): PRGLInstance | undefined;
    startConnection(con_id: string, socket: PRGLIOSocket, dbs: DBOFullyTyped<DBSchemaGenerated>, _dbs: DB, restartIfExists?: boolean): Promise<string | undefined>;
}
export {};
//# sourceMappingURL=ConnectionManager.d.ts.map