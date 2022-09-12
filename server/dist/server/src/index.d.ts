import { ConnectionManager } from "./ConnectionManager";
export declare const API_PATH = "/api";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
export declare const ROOT_DIR: string;
export declare const validateConnection: (c: DBSchemaGenerated["connections"]["columns"]) => Connections;
export declare const getConnectionDetails: (c: Connections) => pg.IConnectionParameters<pg.IClient>;
export declare type BareConnectionDetails = Pick<Connections, "type" | "db_conn" | "db_host" | "db_name" | "db_pass" | "db_port" | "db_user" | "db_ssl" | "ssl_certificate">;
export declare const testDBConnection: (_c: DBSchemaGenerated["connections"]["columns"], expectSuperUser?: boolean) => Promise<true>;
export declare type DBS = DBOFullyTyped<DBSchemaGenerated>;
export declare const EMPTY_USERNAME = "prostgles-no-auth-user", EMPTY_PASSWORD = "prostgles";
export declare const HAS_EMPTY_USERNAME: (db: DBS) => Promise<boolean>;
export declare const PRGL_USERNAME: any, PRGL_PASSWORD: any, POSTGRES_URL: any, POSTGRES_DB: any, POSTGRES_HOST: any, POSTGRES_PASSWORD: any, POSTGRES_PORT: any, POSTGRES_USER: any, POSTGRES_SSL: any, PROSTGLES_STRICT_COOKIE: any;
export declare type Users = Required<DBSchemaGenerated["users"]["columns"]>;
export declare type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
export declare const log: (msg: string, extra?: any) => void;
import { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import pg from "pg-promise/typescript/pg-subset";
export declare const MEDIA_ROUTE_PREFIX = "/prostgles_media";
export declare const connMgr: ConnectionManager;
export declare function get(obj: any, propertyPath: string | string[]): any;
export declare function restartProc(cb?: Function): void;
export declare const upsertConnection: (con: DBSchemaGenerated["connections"]["columns"], user: Users, dbs: DBS) => Promise<Required<{
    access_control?: any;
    backups_config?: {
        enabled?: boolean | undefined;
        cloudConfig: {
            credential_id?: number | null | undefined;
        } | null;
        frequency: "daily" | "weekly" | "monthly" | "hourly";
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
            format: "p" | "c" | "t";
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
    created?: Date | null | undefined;
    db_conn?: string | null | undefined;
    db_host?: string | null | undefined;
    db_name?: string | null | undefined;
    db_pass?: string | null | undefined;
    db_port?: number | null | undefined;
    db_ssl?: "allow" | "require" | "verify-ca" | "verify-full" | "disable" | "prefer" | undefined;
    db_user?: string | null | undefined;
    db_watch_shema?: boolean | null | undefined;
    id?: string | undefined;
    is_state_db?: boolean | null | undefined;
    last_updated?: number | undefined;
    name?: string | null | undefined;
    prgl_params?: any;
    prgl_url?: string | null | undefined;
    ssl_certificate?: string | null | undefined;
    ssl_client_certificate?: string | null | undefined;
    ssl_client_certificate_key?: string | null | undefined;
    ssl_reject_unauthorized?: boolean | null | undefined;
    table_config?: {
        fileTable?: string | undefined;
        storageType: {
            type: "local";
        } | {
            type: "S3";
            credential_id: number;
        };
        referencedTables?: {} | undefined;
        delayedDelete?: {
            deleteAfterNDays: number;
            checkIntervalHours?: number | undefined;
        } | undefined;
    } | null | undefined;
    type?: string | undefined;
    user_id: string;
}> | undefined>;
//# sourceMappingURL=index.d.ts.map