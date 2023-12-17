/// <reference types="node" />
import { Express } from "express";
import pg from "pg-promise/typescript/pg-subset";
import prostgles from "prostgles-server";
import { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import { PRGLIOSocket } from "prostgles-server/dist/DboBuilder";
import { DB, FileTableConfig } from "prostgles-server/dist/Prostgles";
import { SubscriptionHandler } from "prostgles-types";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import { DBSSchema } from "../../commonTypes/publishUtils";
import { WithOrigin } from "./ConnectionChecker";
import { Connections, DBS, DatabaseConfigs } from "./index";
import { Server as httpServer } from "http";
export type Unpromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never;
export type ConnectionTableConfig = Pick<FileTableConfig, "referencedTables"> & DatabaseConfigs["file_table_config"];
export declare const DB_TRANSACTION_KEY: "dbTransactionProstgles";
type User = DBSSchema["users"];
export declare const getACRule: (dbs: DBOFullyTyped<DBSchemaGenerated>, user: User, database_id: number) => Promise<DBSSchema["access_control"] | undefined>;
export declare const getACRules: (dbs: DBOFullyTyped<DBSchemaGenerated>, user: Pick<User, "type">) => Promise<DBSSchema["access_control"][]>;
type PRGLInstance = {
    socket_path: string;
    con: Connections;
    prgl?: Unpromise<ReturnType<typeof prostgles>>;
    error?: any;
    isReady: boolean;
};
export declare const PROSTGLES_CERTS_FOLDER = "prostgles_certificates";
export declare class ConnectionManager {
    prgl_connections: Record<string, PRGLInstance>;
    http: httpServer;
    app: Express;
    withOrigin: WithOrigin;
    dbs?: DBS;
    db?: DB;
    connections?: Connections[];
    database_configs?: DatabaseConfigs[];
    constructor(http: any, app: Express, withOrigin: WithOrigin);
    conSub?: SubscriptionHandler | undefined;
    dbConfSub?: SubscriptionHandler | undefined;
    init: (dbs: DBS, db: DB) => Promise<void>;
    accessControlSkippedFirst: boolean;
    accessControlListeners?: SubscriptionHandler[];
    accessControlHotReload: () => Promise<void>;
    getCertPath(conId: string, type?: "ca" | "cert" | "key"): string;
    saveCertificates(connections: Connections[]): void;
    setUpWSS(): void;
    getFileFolderPath(conId?: string): string;
    getConnectionDb(conId: string): Required<PRGLInstance>["prgl"]["db"] | undefined;
    getNewConnectionDb(connId: string, opts?: pg.IConnectionParameters<pg.IClient>): Promise<import("pg-promise").IDatabase<{}, pg.IClient>>;
    getConnection(conId: string): PRGLInstance;
    getConnections(): Record<string, PRGLInstance>;
    disconnect(conId: string): Promise<boolean>;
    getConnectionData(connection_id: string): Promise<Required<{
        created?: string | null | undefined;
        db_conn?: string | null | undefined;
        db_host?: string | undefined;
        db_name?: string | undefined;
        db_pass?: string | null | undefined;
        db_port?: number | undefined;
        db_ssl?: "disable" | "allow" | "prefer" | "require" | "verify-ca" | "verify-full" | undefined; /** Start connections if accessed */
        db_user?: string | undefined;
        db_watch_shema?: boolean | null | undefined;
        id?: string | undefined;
        info?: {
            canCreateDb?: boolean | undefined;
        } | null | undefined;
        is_state_db?: boolean | null | undefined;
        last_updated?: number | undefined;
        name?: string | null | undefined;
        prgl_params?: any;
        prgl_url?: string | null | undefined;
        ssl_certificate?: string | null | undefined;
        ssl_client_certificate?: string | null | undefined;
        ssl_client_certificate_key?: string | null | undefined;
        ssl_reject_unauthorized?: boolean | null | undefined;
        type: "Standard" | "Connection URI" | "Prostgles";
        user_id?: string | null | undefined;
    }>>;
    getConnectionPath: (con_id: string) => string;
    setFileTable: (con: DBSSchema["connections"], newTableConfig: DatabaseConfigs["file_table_config"]) => Promise<void>;
    startConnection(con_id: string, dbs: DBOFullyTyped<DBSchemaGenerated>, _dbs: DB, socket?: PRGLIOSocket, restartIfExists?: boolean): Promise<string | undefined>;
}
export declare const getDatabaseConfigFilter: (c: Connections) => Pick<Required<{
    created?: string | null | undefined;
    db_conn?: string | null | undefined;
    db_host?: string | undefined;
    db_name?: string | undefined;
    db_pass?: string | null | undefined;
    db_port?: number | undefined;
    db_ssl?: "disable" | "allow" | "prefer" | "require" | "verify-ca" | "verify-full" | undefined; /** Start connections if accessed */
    db_user?: string | undefined;
    db_watch_shema?: boolean | null | undefined;
    id?: string | undefined;
    info?: {
        canCreateDb?: boolean | undefined;
    } | null | undefined;
    is_state_db?: boolean | null | undefined;
    last_updated?: number | undefined;
    name?: string | null | undefined;
    prgl_params?: any;
    prgl_url?: string | null | undefined;
    ssl_certificate?: string | null | undefined;
    ssl_client_certificate?: string | null | undefined;
    ssl_client_certificate_key?: string | null | undefined;
    ssl_reject_unauthorized?: boolean | null | undefined;
    type: "Standard" | "Connection URI" | "Prostgles";
    user_id?: string | null | undefined;
}>, "db_host" | "db_name" | "db_port">;
export declare const getCompiledTS: (code: string) => string;
export {};
//# sourceMappingURL=ConnectionManager.d.ts.map