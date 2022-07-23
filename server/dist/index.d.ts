import { DBSchemaGenerated } from "./DBoGenerated";
export declare const getConnectionDetails: (c: BareConnectionDetails) => pg.IConnectionParameters<pg.IClient>;
export declare type BareConnectionDetails = Pick<Connections, "type" | "db_conn" | "db_host" | "db_name" | "db_pass" | "db_port" | "db_user" | "db_ssl">;
export declare const testDBConnection: (opts: BareConnectionDetails, isSuperUser?: boolean) => Promise<unknown>;
export declare const EMPTY_USERNAME = "prostgles-no-auth-user", EMPTY_PASSWORD = "prostgles";
export declare const HAS_EMPTY_USERNAME: (db: DBOFullyTyped<DBSchemaGenerated>) => Promise<boolean>;
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
//# sourceMappingURL=index.d.ts.map