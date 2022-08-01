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
        credentials_id: string;
    };
};
declare type PRGLInstance = {
    socket_path: string;
    con: Connections;
    prgl?: Unpromise<ReturnType<typeof prostgles>>;
    error?: any;
};
import WebSocket from 'ws';
export declare const PROSTGLES_CERTS_FOLDER = "prostgles_certificates";
export declare class ConnectionManager {
    prgl_connections: Record<string, PRGLInstance>;
    http: any;
    app: any;
    wss?: WebSocket.Server<WebSocket.WebSocket>;
    constructor(http: any, app: any);
    getCertPath(conId: string, type?: "ca" | "cert" | "key"): string;
    saveCertificates(connections: Connections[]): void;
    setUpWSS(): void;
    getFileFolderPath(conId?: string): string;
    getConnection(conId: string): PRGLInstance | undefined;
    disconnect(conId: string): Promise<boolean>;
    startConnection(con_id: string, socket: PRGLIOSocket, dbs: DBOFullyTyped<DBSchemaGenerated>, _dbs: DB, restartIfExists?: boolean): Promise<string | undefined>;
}
export {};
//# sourceMappingURL=ConnectionManager.d.ts.map