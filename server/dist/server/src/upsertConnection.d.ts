import { DBS, Users } from ".";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
export declare const upsertConnection: (con: DBSchemaGenerated["connections"]["columns"], user_id: Users["id"] | null, dbs: DBS) => Promise<{
    connection: Required<{
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
    }>;
    database_config: Required<{
        backups_config?: {
            enabled?: boolean | undefined;
            cloudConfig: {
                credential_id?: number | null | undefined;
            } | null;
            frequency: "daily" | "monthly" | "weekly" | "hourly";
            hour?: number | undefined;
            dayOfWeek?: number | undefined;
            dayOfMonth?: number | undefined;
            keepLast?: number | undefined;
            err?: string | null | undefined;
            dump_options: {
                command: "pg_dumpall";
                clean: boolean;
                dataOnly?: boolean | undefined;
                globalsOnly?: boolean | undefined;
                rolesOnly?: boolean | undefined;
                schemaOnly?: boolean | undefined;
                ifExists?: boolean | undefined;
                encoding?: string | undefined;
                keepLogs?: boolean | undefined;
            } | {
                command: "pg_dump";
                format: "p" | "t" | "c";
                dataOnly?: boolean | undefined;
                clean?: boolean | undefined;
                create?: boolean | undefined;
                encoding?: string | undefined;
                numberOfJobs?: number | undefined;
                noOwner?: boolean | undefined;
                compressionLevel?: number | undefined;
                ifExists?: boolean | undefined;
                keepLogs?: boolean | undefined;
            };
        } | null | undefined;
        db_host: string;
        db_name: string;
        db_port: number;
        file_table_config?: {
            fileTable?: string | undefined;
            storageType: {
                type: "local";
            } | {
                type: "S3";
                credential_id: number;
            };
            referencedTables?: any;
            delayedDelete?: {
                deleteAfterNDays: number;
                checkIntervalHours?: number | undefined;
            } | undefined;
        } | null | undefined;
        id?: number | undefined;
        rest_api_enabled?: boolean | null | undefined;
        table_config?: Record<string, {
            isLookupTable: {
                values: Record<string, string>;
            };
        } | {
            columns: Record<string, string | {
                hint?: string | undefined;
                nullable?: boolean | undefined;
                isText?: boolean | undefined;
                trimmed?: boolean | undefined;
                defaultValue?: any;
            } | {
                jsonbSchema: {
                    type: "string" | "number" | "boolean" | "Date" | "string[]" | "number[]" | "Date[]" | "boolean[]" | "time" | "timestamp" | "time[]" | "timestamp[]";
                    optional?: boolean | undefined;
                    description?: string | undefined;
                } | {
                    type: "Lookup" | "Lookup[]";
                    optional?: boolean | undefined;
                    description?: string | undefined;
                } | {
                    type: "object";
                    optional?: boolean | undefined;
                    description?: string | undefined;
                };
            }>;
        }> | null | undefined;
        table_config_ts?: string | null | undefined;
    }>;
}>;
//# sourceMappingURL=upsertConnection.d.ts.map