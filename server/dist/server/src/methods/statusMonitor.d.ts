import { DBS } from "../index";
import { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
export type Users = Required<DBSchemaGenerated["users"]["columns"]>;
export type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
import { DB } from "prostgles-server/dist/Prostgles";
import pg from "pg-promise/typescript/pg-subset";
import { ConnectionStatus, ServerStatus } from "../../../commonTypes/utils";
export declare let cdbCache: Record<string, DB>;
export declare const getCDB: (connId: string, opts?: pg.IConnectionParameters<pg.IClient>, isTemporary?: boolean) => Promise<import("pg-promise").IDatabase<{}, pg.IClient>>;
export declare const getServerStatus: (db: DB, connId: string) => Promise<ServerStatus>;
export declare const getStatus: (connId: string, dbs: DBS) => Promise<ConnectionStatus>;
export declare const killPID: (connId: string, id_query_hash: string, type?: "cancel" | "terminate") => Promise<any[]>;
//# sourceMappingURL=statusMonitor.d.ts.map