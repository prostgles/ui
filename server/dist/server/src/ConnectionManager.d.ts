import { PRGLIOSocket } from "prostgles-server/dist/DboBuilder";
import { Connections, DBS } from "./index";
import { WithOrigin } from "./ConnectionChecker";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import { DBSSchema } from "../../commonTypes/publishUtils";
import prostgles from "prostgles-server";
import { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import { DB, FileTableConfig } from "prostgles-server/dist/Prostgles";
import { SubscriptionHandler } from "prostgles-types";
import WebSocket from 'ws';
import { Express } from "express";
export type Unpromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never;
export type ConnectionTableConfig = Pick<FileTableConfig, "referencedTables"> & Connections["table_config"];
export declare const DB_TRANSACTION_KEY: "dbTransactionProstgles";
export declare const getACRule: (dbs: DBOFullyTyped<DBSchemaGenerated>, user: DBSSchema["users"], connection_id: string) => Promise<DBSSchema["access_control"] | undefined>;
export declare const getACRules: (dbs: DBOFullyTyped<DBSchemaGenerated>, user: Pick<DBSSchema["users"], "type">) => Promise<DBSSchema["access_control"][]>;
type PRGLInstance = {
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
    db?: DB;
    connections?: Connections[];
    constructor(http: any, app: Express, withOrigin: WithOrigin);
    conSub?: SubscriptionHandler<Connections> | undefined;
    init: (dbs: DBS, db: DB) => Promise<void>;
    getCertPath(conId: string, type?: "ca" | "cert" | "key"): string;
    saveCertificates(connections: Connections[]): void;
    setUpWSS(): void;
    getFileFolderPath(conId?: string): string;
    getConnectionDb(conId: string): Required<PRGLInstance>["prgl"]["db"] | undefined;
    getConnection(conId: string): PRGLInstance | undefined;
    getConnections(): Record<string, PRGLInstance>;
    disconnect(conId: string): Promise<boolean>;
    reloadFileStorage: (connId: string) => Promise<void>;
    getConnectionPath: (con_id: string) => string;
    startConnection(con_id: string, dbs: DBOFullyTyped<DBSchemaGenerated>, _dbs: DB, socket?: PRGLIOSocket, restartIfExists?: boolean): Promise<string | undefined>;
}
export {};
//# sourceMappingURL=ConnectionManager.d.ts.map