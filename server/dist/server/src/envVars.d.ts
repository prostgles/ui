export declare const PRGL_USERNAME: string, PRGL_PASSWORD: string, POSTGRES_URL: string | undefined, POSTGRES_DB: string | undefined, POSTGRES_HOST: string | undefined, POSTGRES_PASSWORD: string | undefined, POSTGRES_PORT: string | undefined, POSTGRES_USER: string | undefined, POSTGRES_SSL: string | undefined, PROSTGLES_STRICT_COOKIE: string | undefined;
export declare const DBS_CONNECTION_INFO: {
    name: string;
    type: "Standard" | "Connection URI";
    db_conn: string | null;
    db_name: string | undefined;
    db_user: string | undefined;
    db_pass: string | null;
    db_host: string | undefined;
    db_port: number;
    db_ssl: "disable" | "allow" | "prefer" | "require" | "verify-ca" | "verify-full";
} & Required<{
    db_name: string;
    db_user: string;
    db_host: string;
    db_port: number;
    db_ssl: "disable" | "allow" | "prefer" | "require" | "verify-ca" | "verify-full";
}> & {
    db_conn: string;
    db_pass?: string | undefined;
};
//# sourceMappingURL=envVars.d.ts.map