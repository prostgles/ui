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
export declare const getAgeFromDiff: (millisecondDiff: number) => {
    years: number;
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
};
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
    destination: (typeof DESTINATIONS)[number]["key"];
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
export type IOStats = {
    majorNumber: number;
    minorNumber: number;
    deviceName: string;
    readsCompletedSuccessfully: number;
    readsMerged: number;
    sectorsRead: number;
    timeSpentReadingMs: number;
    writesCompleted: number;
    writesMerged: number;
    sectorsWritten: number;
    timeSpentWritingMs: number;
    IOsCurrentlyInProgress: number;
    timeSpentDoingIOms: number;
    weightedTimeSpentDoingIOms: number;
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
    memAvailable: number;
    ioInfo?: IOStats[];
};
export type ConnectionStatus = {
    queries: PG_STAT_ACTIVITY[];
    topQueries: AnyObject[];
    blockedQueries: AnyObject[];
    connections: PG_STAT_DATABASE[];
    maxConnections: number;
    noBash: boolean;
    getPidStatsErrors: Partial<Record<string, any>>;
    serverStatus?: ServerStatus;
};
export type SampleSchema = {
    name: string;
    path: string;
} & ({
    type: "sql";
    file: string;
} | {
    type: "dir";
    tableConfigTs: string;
    onMountTs: string;
    onInitSQL: string;
    workspaceConfig: {
        workspaces: DBSSchema["workspaces"][];
    } | undefined;
});
export type ProcStats = {
    pid: number;
    cpu: number;
    mem: number;
    uptime: number;
};
export declare function matchObj(obj1: AnyObject | undefined, obj2: AnyObject | undefined): boolean;
export declare function sliceText(v: string | undefined, maxLen: number, ellipseText?: string, midEllipse?: boolean): string | undefined;
export type ColType = {
    column_name: string;
    escaped_column_name: string;
    data_type: string;
    udt_name: string;
    schema: string;
};
export declare const RELOAD_NOTIFICATION = "Prostgles UI accessible at";
export declare function throttle<Params extends any[]>(func: (...args: Params) => any, timeout: number): (...args: Params) => void;
export declare const SPOOF_TEST_VALUE = "trustme";
export declare const getEntries: <T extends AnyObject>(obj: T) => [keyof T, T[keyof T]][];
export declare const CONNECTION_CONFIG_SECTIONS: readonly ["access_control", "backups", "table_config", "details", "status", "methods", "file_storage", "API"];
/**
 * Ensure that multi-line strings are indented correctly
 */
export declare const fixIndent: (_str: string | TemplateStringsArray) => string;
export declare const getConnectionPaths: ({ id, url_path, }: {
    id: string;
    url_path: string | null;
}) => {
    rest: string;
    ws: string;
    dashboard: string;
    config: string;
};
export declare const API_PATH_SUFFIXES: {
    readonly REST: "/rest-api";
    readonly WS: "/ws-api-db";
    readonly DASHBOARD: "/connections";
    readonly CONFIG: "/connection-config";
};
export declare const PROSTGLES_CLOUD_URL = "https://cloud1.prostgles.com";
export {};
