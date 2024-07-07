import type { DB } from "prostgles-server/dist/Prostgles";
import type { ConnectionStatus, ServerStatus } from "../../../commonTypes/utils";
import type { DBS } from "..";
type PS_ProcInfo = {
    pid: number;
    cpu: number;
    mem: number;
    mhz: string;
    cmd: string;
};
export type ServerLoadStats = {
    pidStats: PS_ProcInfo[];
    serverStatus: ServerStatus;
};
export declare const getCpuCoresMhz: (db: DB, connId: string) => Promise<number[]>;
export declare const getPidStats: (db: DB, connId: string) => Promise<ServerLoadStats | undefined>;
export declare const getStatus: (connId: string, dbs: DBS) => Promise<ConnectionStatus>;
export {};
//# sourceMappingURL=getPidStats.d.ts.map