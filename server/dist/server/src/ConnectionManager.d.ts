import { PRGLIOSocket } from "prostgles-server/dist/DboBuilder";
import { Connections, DBS } from "./index";
import { WithOrigin } from "./ConnectionChecker";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import prostgles from "prostgles-server";
import { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import { DB, FileTableConfig } from "prostgles-server/dist/Prostgles";
import { SubscriptionHandler } from "prostgles-types";
import WebSocket from 'ws';
import { Express } from "express";
export declare type Unpromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never;
export declare type ConnectionTableConfig = Pick<FileTableConfig, "referencedTables"> & Connections["table_config"];
export declare const DB_TRANSACTION_KEY: "dbTransactionProstgles";
declare type PRGLInstance = {
    socket_path: string;
    con: Connections;
    prgl?: Unpromise<ReturnType<typeof prostgles>>;
    error?: any;
};
export declare const PROSTGLES_CERTS_FOLDER = "prostgles_certificates";
export declare class ConnectionManager {
    prgl_connections: Record<string, PRGLInstance>;
    http: any;
    app: Express;
    wss?: WebSocket.Server<WebSocket.WebSocket>;
    withOrigin: WithOrigin;
    dbs?: DBS;
    constructor(http: any, app: Express, withOrigin: WithOrigin);
    conSub?: SubscriptionHandler<Connections> | undefined;
    init: (dbs: DBS) => Promise<void>;
    getCertPath(conId: string, type?: "ca" | "cert" | "key"): string;
    saveCertificates(connections: Connections[]): void;
    setUpWSS(): void;
    getFileFolderPath(conId?: string): string;
    getConnectionDb(conId: string): Required<PRGLInstance>["prgl"]["db"] | undefined;
    getConnection(conId: string): PRGLInstance | undefined;
    getConnections(): Record<string, PRGLInstance>;
    disconnect(conId: string): Promise<boolean>;
    startConnection(con_id: string, socket: PRGLIOSocket, dbs: DBOFullyTyped<DBSchemaGenerated>, _dbs: DB, restartIfExists?: boolean): Promise<string | undefined>;
}
export {};
//# sourceMappingURL=ConnectionManager.d.ts.map