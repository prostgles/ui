/// <reference types="node" />
import type { Express } from "express";
import type { Server as httpServer } from "http";
import type pg from "pg-promise/typescript/pg-subset";
import type prostgles from "prostgles-server";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import type { DB } from "prostgles-server/dist/Prostgles";
import type { FileTableConfig, ProstglesInitOptions } from "prostgles-server/dist/ProstglesTypes";
import type { SubscriptionHandler } from "prostgles-types";
import type { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import type { WithOrigin } from "../ConnectionChecker";
import type { Connections, DBS, DatabaseConfigs } from "../index";
import { ForkedPrglProcRunner } from "./ForkedPrglProcRunner";
export type Unpromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never;
export type ConnectionTableConfig = Pick<FileTableConfig, "referencedTables"> & DatabaseConfigs["file_table_config"];
export declare const DB_TRANSACTION_KEY: "dbTransactionProstgles";
export type User = DBSSchema["users"];
export declare const getACRules: (dbs: DBOFullyTyped<DBSchemaGenerated>, user: Pick<User, "type">) => Promise<DBSSchema["access_control"][]>;
type PRGLInstance = {
    socket_path: string;
    con: Connections;
    dbConf: DatabaseConfigs;
    prgl?: Unpromise<ReturnType<typeof prostgles>>;
    error?: any;
    connectionInfo: pg.IConnectionParameters<pg.IClient>;
    methodRunner: ForkedPrglProcRunner | undefined;
    tableConfigRunner: ForkedPrglProcRunner | undefined;
    onMountRunner: ForkedPrglProcRunner | undefined;
    isReady: boolean;
    lastRestart: number;
    isSuperUser: boolean | undefined;
};
export declare const getReloadConfigs: (this: ConnectionManager, c: Connections, conf: DatabaseConfigs, dbs: DBS) => Promise<Pick<ProstglesInitOptions, "fileTable" | "tableConfig" | "restApi">>;
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
    getConnectionsWithPublicAccess: () => (Pick<Required<{
        backups_config?: {
            enabled?: boolean | undefined;
            cloudConfig: {
                credential_id?: number | null | undefined;
            } | null;
            frequency: "daily" | "monthly" | "weekly" | "hourly";
            hour?: number | undefined;
            dayOfWeek?: number | undefined;
            dayOfMonth?: number | undefined;
            keepLast?: number | undefined;
            err?: string | null | undefined;
            dump_options: {
                command: "pg_dumpall";
                clean: boolean;
                dataOnly?: boolean | undefined;
                globalsOnly?: boolean | undefined;
                rolesOnly?: boolean | undefined;
                schemaOnly?: boolean | undefined;
                ifExists?: boolean | undefined;
                encoding?: string | undefined;
                keepLogs?: boolean | undefined;
            } | {
                command: "pg_dump";
                format: "c" | "p" | "t";
                dataOnly?: boolean | undefined;
                clean?: boolean | undefined;
                create?: boolean | undefined;
                encoding?: string | undefined;
                numberOfJobs?: number | undefined;
                noOwner?: boolean | undefined;
                compressionLevel?: number | undefined;
                ifExists?: boolean | undefined;
                keepLogs?: boolean | undefined;
            };
        } | null | undefined;
        db_host: string;
        db_name: string;
        db_port: number;
        file_table_config?: {
            fileTable?: string | undefined;
            storageType: {
                type: "local";
            } | {
                type: "S3";
                credential_id: number;
            };
            referencedTables?: any;
            delayedDelete?: {
                deleteAfterNDays: number;
                checkIntervalHours?: number | undefined;
            } | undefined;
        } | null | undefined;
        id?: number | undefined;
        on_mount_ts?: string | null | undefined;
        on_mount_ts_disabled?: boolean | null | undefined;
        rest_api_enabled?: boolean | null | undefined;
        sync_users?: boolean | null | undefined;
        table_config?: Record<string, {
            isLookupTable: {
                values: Record<string, string>;
            };
        } | {
            columns: Record<string, string | {
                hint?: string | undefined;
                nullable?: boolean | undefined;
                isText?: boolean | undefined;
                trimmed?: boolean | undefined;
                defaultValue?: any;
            } | {
                jsonbSchema: {
                    type: "string" | "number" | "boolean" | "Date" | "string[]" | "number[]" | "Date[]" | "boolean[]" | "time" | "timestamp" | "time[]" | "timestamp[]";
                    optional?: boolean | undefined;
                    description?: string | undefined;
                } | {
                    type: "Lookup" | "Lookup[]";
                    optional?: boolean | undefined;
                    description?: string | undefined;
                } | {
                    type: "object";
                    optional?: boolean | undefined;
                    description?: string | undefined;
                };
            }>;
        }> | null | undefined;
        table_config_ts?: string | null | undefined;
        table_config_ts_disabled?: boolean | null | undefined;
    }>, "id"> & {
        connections: {
            id: string;
        }[];
        access_control_user_types: {
            user_type: string;
            access_control_id: number;
        }[];
    })[];
    /**
     * If a connection was reloaded due to permissions change (revoke/grant) then
     * restart all other related connections that did not get this event
     *
    */
    onConnectionReload: (conId: string, dbConfId: number) => Promise<void>;
    setTableConfig: (conId: string, table_config_ts: string | undefined | null, disabled: boolean | null) => Promise<1 | undefined>;
    setOnMount: (conId: string, on_mount_ts: string | undefined | null, disabled: boolean | null) => Promise<unknown>;
    syncUsers: (db: DBOFullyTyped, userTypes: string[], syncableColumns: string[]) => Promise<void>;
    userSub?: SubscriptionHandler | undefined;
    setSyncUserSub: () => Promise<void>;
    conSub?: SubscriptionHandler | undefined;
    dbConfSub?: SubscriptionHandler | undefined;
    dbConfigs: (Pick<DBSSchema["database_configs"], "id"> & {
        connections: {
            id: string;
        }[];
        access_control_user_types: {
            user_type: string;
            access_control_id: number;
        }[];
    })[];
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
    getConnection(conId: string): PRGLInstance & Pick<Required<PRGLInstance>, "prgl">;
    getConnections(): Record<string, PRGLInstance>;
    disconnect(conId: string): Promise<boolean>;
    getConnectionData(connection_id: string): Promise<Required<{
        created?: string | null | undefined;
        db_conn?: string | null | undefined;
        db_host?: string | undefined;
        db_name: string;
        db_pass?: string | null | undefined;
        db_port?: number | undefined;
        db_ssl?: "disable" | "allow" | "prefer" | "require" | "verify-ca" | "verify-full" | undefined;
        db_user?: string | undefined;
        db_watch_shema?: boolean | null | undefined;
        disable_realtime?: boolean | null | undefined;
        id?: string | undefined;
        info?: {
            canCreateDb?: boolean | undefined;
        } | null | undefined;
        is_state_db?: boolean | null | undefined;
        last_updated?: string | undefined;
        name: string;
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
    startConnection: (con_id: string, dbs: DBOFullyTyped<DBSchemaGenerated>, _dbs: DB, socket?: import("prostgles-server/dist/DboBuilder").PRGLIOSocket | undefined, restartIfExists?: boolean | undefined) => Promise<string | undefined>;
}
export declare const cdbCache: Record<string, DB>;
export declare const getCDB: (connId: string, opts?: pg.IConnectionParameters<pg.IClient>, isTemporary?: boolean) => Promise<import("pg-promise").IDatabase<{}, pg.IClient>>;
export {};
//# sourceMappingURL=ConnectionManager.d.ts.map