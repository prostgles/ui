import type { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
export type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
export type ConnectionInsert = DBSchemaGenerated["connections"]["columns"];
import type { DBSConnectionInfo } from "../electronConfig";
type ConnectionDefaults = Pick<DBSConnectionInfo, "db_host" | "db_name" | "db_port" | "db_ssl" | "db_user">;
type ValidatedConnectionDetails = Required<ConnectionDefaults> & {
    db_conn: string;
    db_pass?: string;
};
export type ConnectionInfo = Partial<DBSConnectionInfo & Connections & ConnectionInsert>;
export declare const validateConnection: <C extends Partial<DBSConnectionInfo & Required<{
    created?: string | null | undefined;
    db_conn?: string | null | undefined;
    db_host?: string | undefined;
    db_name: string;
    db_pass?: string | null | undefined;
    db_port?: number | undefined;
    db_ssl?: "disable" | "allow" | "prefer" | "require" | "verify-ca" | "verify-full" | undefined;
    db_user?: string | undefined;
    db_watch_shema?: boolean | null | undefined;
    disable_realtime?: boolean | null | undefined;
    id?: string | undefined;
    info?: {
        canCreateDb?: boolean | undefined;
    } | null | undefined;
    is_state_db?: boolean | null | undefined;
    last_updated?: string | undefined;
    name: string;
    prgl_params?: any;
    prgl_url?: string | null | undefined;
    ssl_certificate?: string | null | undefined;
    ssl_client_certificate?: string | null | undefined;
    ssl_client_certificate_key?: string | null | undefined;
    ssl_reject_unauthorized?: boolean | null | undefined;
    type: "Standard" | "Connection URI" | "Prostgles";
    user_id?: string | null | undefined;
}> & {
    created?: string | null | undefined;
    db_conn?: string | null | undefined;
    db_host?: string | undefined;
    db_name: string;
    db_pass?: string | null | undefined;
    db_port?: number | undefined;
    db_ssl?: "disable" | "allow" | "prefer" | "require" | "verify-ca" | "verify-full" | undefined;
    db_user?: string | undefined;
    db_watch_shema?: boolean | null | undefined;
    disable_realtime?: boolean | null | undefined;
    id?: string | undefined;
    info?: {
        canCreateDb?: boolean | undefined;
    } | null | undefined;
    is_state_db?: boolean | null | undefined;
    last_updated?: string | undefined;
    name: string;
    prgl_params?: any;
    prgl_url?: string | null | undefined;
    ssl_certificate?: string | null | undefined;
    ssl_client_certificate?: string | null | undefined;
    ssl_client_certificate_key?: string | null | undefined;
    ssl_reject_unauthorized?: boolean | null | undefined;
    type: "Standard" | "Connection URI" | "Prostgles";
    user_id?: string | null | undefined;
}>>(rawConnection: C) => C & ValidatedConnectionDetails;
export {};
//# sourceMappingURL=validateConnection.d.ts.map