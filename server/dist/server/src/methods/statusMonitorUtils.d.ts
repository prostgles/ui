import type { DB } from "prostgles-server/dist/Prostgles";
import { type ServerStatus } from "../../../commonTypes/utils";
export declare const IGNORE_QUERY = "prostgles-status-monitor-query";
export declare const execPSQLBash: (db: DB, connId: string, command: string) => Promise<string[]>;
export declare const getServerStatus: (db: DB, connId: string) => Promise<ServerStatus>;
export declare const killPID: (connId: string, id_query_hash: string, type?: "cancel" | "terminate") => Promise<any[]>;
//# sourceMappingURL=statusMonitorUtils.d.ts.map