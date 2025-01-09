export type ProstglesInitState = {
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
    electronIssue?: {
        type: "Older schema";
    };
    dbsWsApiPath: string;
    initError?: any;
    connectionError?: any;
    ok: boolean;
    canDumpAndRestore: {
        psql: string;
        pg_dump: string;
        pg_restore: string;
    } | undefined;
};
export type ServerState = ProstglesInitState;
