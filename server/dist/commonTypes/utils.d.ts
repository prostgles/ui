import { DBSSchema } from "./publishUtils";
export declare const SECOND = 1000;
export declare const MINUTE: number;
export declare const HOUR: number;
export declare const DAY: number;
export declare const MONTH: number;
export declare const YEAR: number;
export type AGE = {
    years?: number;
    months?: number;
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
    milliseconds?: number;
};
export declare const QUERY_WATCH_IGNORE = "prostgles internal query that should be excluded from schema watch ";
export declare const getAge: <ReturnALL extends boolean = false>(date1: number, date2: number, returnAll?: ReturnALL | undefined) => ReturnALL extends true ? Required<AGE> : AGE;
export declare const DESTINATIONS: readonly [{
    readonly key: "Local";
    readonly subLabel: "Saved locally (server in address bar)";
}, {
    readonly key: "Cloud";
    readonly subLabel: "Saved to Amazon S3";
}];
export type DumpOpts = DBSSchema["backups"]["options"];
export type PGDumpParams = {
    options: DumpOpts;
    credentialID?: DBSSchema["backups"]["credential_id"];
    destination: typeof DESTINATIONS[number]["key"];
    initiator?: string;
};
export type DeepWriteable<T> = {
    -readonly [P in keyof T]: DeepWriteable<T[P]>;
};
type AnyObject = Record<string, any>;
export type WithUndef<T extends AnyObject | undefined> = T extends AnyObject ? {
    [K in keyof T]: T[K] | undefined;
} : T;
export type GetElementType<T extends any[] | readonly any[]> = T extends (infer U)[] ? U : never;
export type OmitDistributive<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
export type PG_STAT_ACTIVITY = {
    datid: number | null;
    datname: string | null;
    pid: number;
    usesysid: number | null;
    usename: string | null;
    application_name: string;
    client_addr: string | null;
    client_hostname: string | null;
    client_port: number | null;
    backend_start: string;
    xact_start: string | null;
    query_start: string | null;
    state_change: string | null;
    wait_event_type: string | null;
    wait_event: string | null;
    state: string | null;
    backend_xid: any | null;
    backend_xmin: any | null;
    query: string;
    backend_type: string;
    blocked_by: number[];
    running_time: AnyObject;
};
export type PG_STAT_DATABASE = {
    datid: number;
    datname: string;
    numbackends: number;
    xact_commit: number;
    xact_rollback: number;
    blks_read: number;
    blks_hit: number;
    tup_returned: number;
    tup_fetched: number;
    tup_inserted: number;
    tup_updated: number;
    tup_deleted: number;
    conflicts: number;
    temp_files: number;
    temp_bytes: number;
    deadlocks: number;
    checksum_failures: number | null;
    checksum_last_failure: string | null;
    blk_read_time: number;
    blk_write_time: number;
    stats_reset: string;
};
export type ServerStatus = {
    clock_ticks: number;
    total_memoryKb: number;
    free_memoryKb: number;
    uptimeSeconds: number;
    cpu_model: string;
    cpu_cores_mhz: string;
    cpu_mhz: string;
    disk_space: string;
};
export type ConnectionStatus = {
    queries: PG_STAT_ACTIVITY[];
    topQueries: AnyObject[];
    blockedQueries: AnyObject[];
    connections: PG_STAT_DATABASE[];
    maxConnections: number;
    noBash: boolean;
    serverStatus?: ServerStatus;
};
export {};
//# sourceMappingURL=utils.d.ts.map