export declare const getConnectionDetails: (c: BareConnectionDetails) => pg.IConnectionParameters<pg.IClient>;
declare type BareConnectionDetails = Pick<Connections, "type" | "db_conn" | "db_host" | "db_name" | "db_pass" | "db_port" | "db_user" | "db_ssl">;
export declare const testDBConnection: (opts: BareConnectionDetails, isSuperUser?: boolean) => Promise<unknown>;
import { DBSchemaGenerated } from "./DBoGenerated";
export declare type Users = DBSchemaGenerated["users"]["columns"];
export declare type Connections = DBSchemaGenerated["connections"]["columns"];
import { Auth } from 'prostgles-server/dist/AuthHandler';
import pg from "pg-promise/typescript/pg-subset";
export declare const MEDIA_ROUTE_PREFIX = "/prostgles_media";
export declare const auth: Auth<DBSchemaGenerated>;
export declare function get(obj: any, propertyPath: string | string[]): any;
export declare function restartProc(cb?: Function): void;
export {};
//# sourceMappingURL=index.d.ts.map