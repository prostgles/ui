import { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
export type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
export type ConnectionInsert = DBSchemaGenerated["connections"]["columns"];
import { DBSConnectionInfo } from "../electronConfig";
export declare const validateConnection: <C extends {
    created?: string | null | undefined;
    db_conn?: string | null | undefined;
    db_host?: string | undefined;
    db_name?: string | undefined;
    db_pass?: string | null | undefined;
    db_port?: number | undefined;
    db_ssl?: "disable" | "allow" | "prefer" | "require" | "verify-ca" | "verify-full" | undefined;
    db_user?: string | undefined;
    db_watch_shema?: boolean | null | undefined;
    id?: string | undefined;
    info?: {
        canCreateDb?: boolean | undefined;
    } | null | undefined;
    is_state_db?: boolean | null | undefined;
    last_updated?: number | undefined;
    name?: string | null | undefined;
    prgl_params?: any;
    prgl_url?: string | null | undefined;
    ssl_certificate?: string | null | undefined;
    ssl_client_certificate?: string | null | undefined;
    ssl_client_certificate_key?: string | null | undefined;
    ssl_reject_unauthorized?: boolean | null | undefined;
    type: "Standard" | "Connection URI" | "Prostgles";
    user_id?: string | null | undefined;
} | DBSConnectionInfo | Required<{
    created?: string | null | undefined;
    db_conn?: string | null | undefined;
    db_host?: string | undefined;
    db_name?: string | undefined;
    db_pass?: string | null | undefined;
    db_port?: number | undefined;
    db_ssl?: "disable" | "allow" | "prefer" | "require" | "verify-ca" | "verify-full" | undefined;
    db_user?: string | undefined;
    db_watch_shema?: boolean | null | undefined;
    id?: string | undefined;
    info?: {
        canCreateDb?: boolean | undefined;
    } | null | undefined;
    is_state_db?: boolean | null | undefined;
    last_updated?: number | undefined;
    name?: string | null | undefined;
    prgl_params?: any;
    prgl_url?: string | null | undefined;
    ssl_certificate?: string | null | undefined;
    ssl_client_certificate?: string | null | undefined;
    ssl_client_certificate_key?: string | null | undefined;
    ssl_reject_unauthorized?: boolean | null | undefined;
    type: "Standard" | "Connection URI" | "Prostgles";
    user_id?: string | null | undefined;
}>>(rawConnection: Record<string, any> | C) => C;
//# sourceMappingURL=validateConnection.d.ts.map