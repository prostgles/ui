import { DBSchemaGenerated } from "./DBoGenerated";
export declare const validateConnection: (c: DBSchemaGenerated["connections"]["columns"]) => Connections;
export declare const getConnectionDetails: (c: Connections) => pg.IConnectionParameters<pg.IClient>;
export declare type BareConnectionDetails = Pick<Connections, "type" | "db_conn" | "db_host" | "db_name" | "db_pass" | "db_port" | "db_user" | "db_ssl" | "ssl_certificate">;
export declare const testDBConnection: (_c: DBSchemaGenerated["connections"]["columns"], expectSuperUser?: boolean) => Promise<true>;
export declare type DBS = DBOFullyTyped<DBSchemaGenerated>;
export declare const EMPTY_USERNAME = "prostgles-no-auth-user", EMPTY_PASSWORD = "prostgles";
export declare const HAS_EMPTY_USERNAME: (db: DBS) => Promise<boolean>;
export declare type Users = Required<DBSchemaGenerated["users"]["columns"]>;
export declare type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
import { Auth } from 'prostgles-server/dist/AuthHandler';
import { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import pg from "pg-promise/typescript/pg-subset";
export declare const MEDIA_ROUTE_PREFIX = "/prostgles_media";
export declare const auth: Auth<DBSchemaGenerated>;
import { ConnectionManager } from "./ConnectionManager";
export declare const connMgr: ConnectionManager;
export declare function get(obj: any, propertyPath: string | string[]): any;
export declare function restartProc(cb?: Function): void;
export declare const upsertConnection: (con: DBSchemaGenerated["connections"]["columns"], user: Users, dbs: DBS) => Promise<Required<{
    access_control?: any;
    backups_config?: any;
    created?: Date | null | undefined;
    db_conn?: string | null | undefined;
    db_host?: string | null | undefined;
    db_name?: string | null | undefined;
    db_pass?: string | null | undefined;
    db_port?: number | null | undefined;
    db_ssl?: string | undefined;
    db_user?: string | null | undefined;
    db_watch_shema?: boolean | null | undefined;
    id?: string | undefined; /**
     * Cannot use connection uri without having ssl issues
     * https://github.com/brianc/node-postgres/issues/2281
     */
    is_state_db?: boolean | null | undefined;
    last_updated?: number | undefined;
    name?: string | null | undefined;
    prgl_params?: any;
    prgl_url?: string | null | undefined;
    ssl_certificate?: string | null | undefined;
    ssl_client_certificate?: string | null | undefined;
    ssl_client_certificate_key?: string | null | undefined;
    ssl_reject_unauthorized?: boolean | null | undefined;
    table_config?: any;
    type?: string | undefined;
    user_id: string;
}> | undefined>;
//# sourceMappingURL=index.d.ts.map