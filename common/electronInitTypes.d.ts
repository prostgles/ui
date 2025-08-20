export type ProstglesInitState<T extends Record<string, unknown> = Record<string, unknown>> = {
    error?: undefined;
    state: "loading";
} | ({
    error?: undefined;
    state: "ok";
} & T) | {
    error: Error | string | number | bigint | Record<string, any>;
    state: "error";
    errorType: "init" | "connection";
};
export type ProstglesState<T extends Record<string, unknown> = Record<string, unknown>> = {
    isElectron: boolean;
    xRealIpSpoofable?: boolean;
    electronCredsProvided?: boolean;
    electronCreds?: {
        db_conn: string;
        db_host: string;
        db_port: number;
        db_user: string;
        db_name: string;
        db_pass: string;
        db_ssl: string;
    };
    initState: ProstglesInitState<T>;
};
type OS = "Windows" | "Linux" | "Mac" | "";
export declare const programList: readonly ["psql", "pg_dump", "pg_restore", "docker"];
export type InstalledPrograms = {
    os: OS;
    filePath: string;
} & Record<(typeof programList)[number], string | undefined>;
export declare const DEFAULT_ELECTRON_CONNECTION: {
    readonly type: "Standard";
    readonly db_host: "localhost";
    readonly db_port: 5432;
    readonly db_user: "prostgles_desktop";
    readonly db_name: "prostgles_desktop_db";
};
export {};
