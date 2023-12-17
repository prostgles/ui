import { FileTableConfig } from "prostgles-server/dist/Prostgles";
import { Connections, DBS, DatabaseConfigs } from "..";
import { ConnectionManager } from "./ConnectionManager";
export declare const getDatabaseConfigFilter: (c: Connections) => Pick<Required<{
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
}>, "db_name" | "db_host" | "db_port">;
type ParseTableConfigArgs = {
    dbs: DBS;
    conMgr: ConnectionManager;
    con: Connections;
} & ({
    type: "saved";
    newTableConfig?: undefined;
} | {
    type: "new";
    newTableConfig: DatabaseConfigs["file_table_config"];
});
export declare const parseTableConfig: ({ con, conMgr, dbs, type, newTableConfig }: ParseTableConfigArgs) => Promise<{
    fileTable?: FileTableConfig | undefined;
    tableConfigOk: boolean;
}>;
export declare const getCompiledTS: (code: string) => string;
export declare const getRestApiConfig: (conMgr: ConnectionManager, conId: string, dbConf: DatabaseConfigs) => import("prostgles-server/dist/RestApi").RestApiConfig | undefined;
export declare const getTableConfig: ({ table_config, table_config_ts }: DatabaseConfigs) => any;
export {};
//# sourceMappingURL=connectionManagerUtils.d.ts.map