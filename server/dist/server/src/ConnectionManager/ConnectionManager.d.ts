/// <reference types="node" />
import { Express } from "express";
import { Server as httpServer } from "http";
import pg from "pg-promise/typescript/pg-subset";
import prostgles from "prostgles-server";
import { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import { DB, FileTableConfig, ProstglesInitOptions } from "prostgles-server/dist/Prostgles";
import { SubscriptionHandler } from "prostgles-types";
import { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
import { DBSSchema } from "../../../commonTypes/publishUtils";
import { WithOrigin } from "../ConnectionChecker";
import { Connections, DBS, DatabaseConfigs } from "../index";
export type Unpromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never;
export type ConnectionTableConfig = Pick<FileTableConfig, "referencedTables"> & DatabaseConfigs["file_table_config"];
export declare const DB_TRANSACTION_KEY: "dbTransactionProstgles";
export type User = DBSSchema["users"];
export declare const getACRules: (dbs: DBOFullyTyped<DBSchemaGenerated>, user: Pick<User, "type">) => Promise<DBSSchema["access_control"][]>;
type PRGLInstance = {
    socket_path: string;
    con: Connections;
    prgl?: Unpromise<ReturnType<typeof prostgles>>;
    error?: any;
    isReady: boolean;
};
export declare const getReloadConfigs: (this: ConnectionManager, c: Connections, conf: DatabaseConfigs, dbs: DBS) => Promise<Pick<ProstglesInitOptions, "fileTable" | "tableConfig" | "restApi">>;
export declare const PROSTGLES_CERTS_FOLDER = "prostgles_certificates";
export declare class ConnectionManager {
    prgl_connections: Record<string, PRGLInstance>;
    http: httpServer;
    app: Express;
    withOrigin: WithOrigin;
    dbs?: DBS;
    db?: DB;
    connections?: Connections[];
    database_configs?: DatabaseConfigs[];
    constructor(http: any, app: Express, withOrigin: WithOrigin);
    conSub?: SubscriptionHandler | undefined;
    dbConfSub?: SubscriptionHandler | undefined;
    init: (dbs: DBS, db: DB) => Promise<void>;
    accessControlSkippedFirst: boolean;
    accessControlListeners?: SubscriptionHandler[];
    accessControlHotReload: () => Promise<void>;
    getCertPath(conId: string, type?: "ca" | "cert" | "key"): string;
    saveCertificates(connections: Connections[]): void;
    setUpWSS(): void;
    getFileFolderPath(conId?: string): string;
    getConnectionDb(conId: string): Required<PRGLInstance>["prgl"]["db"] | undefined;
    getNewConnectionDb(connId: string, opts?: pg.IConnectionParameters<pg.IClient>): Promise<import("pg-promise").IDatabase<{}, pg.IClient>>;
    getConnection(conId: string): PRGLInstance;
    getConnections(): Record<string, PRGLInstance>;
    disconnect(conId: string): Promise<boolean>;
    getConnectionData(connection_id: string): Promise<Required<{
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
    }>>;
    getConnectionPath: (con_id: string) => string;
    setFileTable: (con: DBSSchema["connections"], newTableConfig: DatabaseConfigs["file_table_config"]) => Promise<void>;
    startConnection: (con_id: string, dbs: {
        access_control: import("prostgles-types").TableHandler<{
            created?: string | null | undefined;
            database_id?: number | null | undefined;
            dbPermissions: {
                type: "Run SQL";
                allowSQL?: boolean | undefined;
            } | {
                type: "All views/tables";
                allowAllTables: ("select" | "insert" | "update" | "delete")[];
            } | {
                type: "Custom";
                customTables: {
                    tableName: string;
                    select?: boolean | {
                        fields: "" | string[] | "*" | Record<string, true | 1> | Record<string, false | 0>;
                        forcedFilterDetailed?: any;
                        filterFields?: "" | string[] | "*" | Record<string, true | 1> | Record<string, false | 0> | undefined;
                        orderByFields?: "" | string[] | "*" | Record<string, true | 1> | Record<string, false | 0> | undefined;
                    } | undefined;
                    update?: boolean | {
                        fields: "" | string[] | "*" | Record<string, true | 1> | Record<string, false | 0>;
                        forcedFilterDetailed?: any;
                        checkFilterDetailed?: any;
                        filterFields?: "" | string[] | "*" | Record<string, true | 1> | Record<string, false | 0> | undefined;
                        orderByFields?: "" | string[] | "*" | Record<string, true | 1> | Record<string, false | 0> | undefined;
                        forcedDataDetail?: any[] | undefined;
                        dynamicFields?: {
                            filterDetailed: any;
                            fields: "" | string[] | "*" | Record<string, true | 1> | Record<string, false | 0>;
                        }[] | undefined;
                    } | undefined;
                    insert?: boolean | {
                        fields: "" | string[] | "*" | Record<string, true | 1> | Record<string, false | 0>;
                        forcedDataDetail?: any[] | undefined;
                        checkFilterDetailed?: any;
                    } | undefined;
                    delete?: boolean | {
                        filterFields: "" | string[] | "*" | Record<string, true | 1> | Record<string, false | 0>;
                        forcedFilterDetailed?: any;
                    } | undefined;
                }[];
            };
            dbsPermissions?: {
                createWorkspaces?: boolean | undefined;
                viewPublishedWorkspaces?: {
                    workspaceIds: string[];
                } | undefined;
            } | null | undefined;
            id?: number | undefined;
            name?: string | null | undefined;
        }>;
        access_control_methods: import("prostgles-types").TableHandler<{
            access_control_id: number;
            published_method_id: number;
        }>;
        access_control_user_types: import("prostgles-types").TableHandler<{
            access_control_id: number;
            user_type: string;
        }>;
        backups: import("prostgles-types").TableHandler<{
            connection_details?: string | undefined;
            connection_id?: string | null | undefined;
            content_type?: string | undefined;
            created?: string | undefined;
            credential_id?: number | null | undefined;
            dbSizeInBytes: number;
            destination: "Local" | "Cloud" | "None (temp stream)";
            details?: any;
            dump_command: string;
            dump_logs?: string | null | undefined;
            id?: string | undefined;
            initiator?: string | null | undefined;
            last_updated?: string | undefined;
            local_filepath?: string | null | undefined;
            options: {
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
            restore_command?: string | null | undefined;
            restore_end?: string | null | undefined;
            restore_logs?: string | null | undefined;
            restore_options?: {
                command: "pg_restore" | "psql";
                format: "p" | "t" | "c";
                clean: boolean;
                newDbName?: string | undefined;
                create?: boolean | undefined;
                dataOnly?: boolean | undefined;
                noOwner?: boolean | undefined;
                numberOfJobs?: number | undefined;
                ifExists?: boolean | undefined;
                keepLogs?: boolean | undefined;
            } | undefined;
            restore_start?: string | null | undefined;
            restore_status?: {
                ok: string;
            } | {
                err: string;
            } | {
                loading: {
                    loaded: number;
                    total: number;
                };
            } | null | undefined;
            sizeInBytes?: number | null | undefined;
            status: {
                ok: string;
            } | {
                err: string;
            } | {
                loading?: {
                    loaded: number;
                    total?: number | undefined;
                } | undefined;
            };
            uploaded?: string | null | undefined;
        }>;
        connections: import("prostgles-types").TableHandler<{
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
        credential_types: import("prostgles-types").TableHandler<{
            id: string;
        }>;
        credentials: import("prostgles-types").TableHandler<{
            bucket?: string | null | undefined;
            id?: number | undefined;
            key_id: string;
            key_secret: string;
            name?: string | undefined;
            region?: string | null | undefined;
            type?: string | undefined;
            user_id?: string | null | undefined;
        }>;
        database_configs: import("prostgles-types").TableHandler<{
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
        global_settings: import("prostgles-types").TableHandler<{
            allowed_ips?: string[] | undefined;
            allowed_ips_enabled?: boolean | undefined;
            allowed_origin?: string | null | undefined;
            id?: number | undefined;
            magic_link_validity_days?: number | undefined;
            session_max_age_days?: number | undefined;
            tableConfig?: any;
            trust_proxy?: boolean | undefined;
            updated_by?: "user" | "app" | undefined;
        }>;
        links: import("prostgles-types").TableHandler<{
            closed?: boolean | null | undefined;
            created?: string | null | undefined;
            deleted?: boolean | null | undefined;
            disabled?: boolean | null | undefined;
            id?: string | undefined;
            last_updated: number;
            options: {
                type: "table";
                colorArr?: number[] | undefined;
                tablePath: {
                    table: string;
                    on: Record<string, any>[];
                }[];
            } | {
                type: "map";
                colorArr?: number[] | undefined;
                smartGroupFilter?: {
                    $and: any[];
                } | {
                    $or: any[];
                } | undefined;
                joinPath?: {
                    table: string;
                    on: Record<string, any>[];
                }[] | undefined;
                localTableName?: string | undefined;
                groupByColumn?: string | undefined;
                fromSelected?: boolean | undefined;
                sql?: string | undefined;
                columns: {
                    name: string;
                    colorArr: number[];
                }[];
            } | {
                type: "timechart";
                colorArr?: number[] | undefined;
                smartGroupFilter?: {
                    $and: any[];
                } | {
                    $or: any[];
                } | undefined;
                joinPath?: {
                    table: string;
                    on: Record<string, any>[];
                }[] | undefined;
                localTableName?: string | undefined;
                groupByColumn?: string | undefined;
                fromSelected?: boolean | undefined;
                sql?: string | undefined;
                columns: {
                    name: string;
                    colorArr: number[];
                    statType?: {
                        funcName: "$min" | "$max" | "$countAll" | "$avg" | "$sum";
                        numericColumn: string;
                    } | undefined;
                }[];
            };
            user_id: string;
            w1_id: string;
            w2_id: string;
            workspace_id?: string | null | undefined;
        }>;
        login_attempts: import("prostgles-types").TableHandler<{
            auth_type: "session-id" | "magic-link" | "login";
            created?: string | null | undefined;
            failed?: boolean | null | undefined;
            id?: number | undefined;
            info?: string | null | undefined;
            ip_address: string;
            ip_address_remote?: string | null | undefined;
            magic_link_id?: string | null | undefined;
            sid?: string | null | undefined;
            type?: "web" | "api_token" | "desktop" | "mobile" | undefined;
            user_agent?: string | null | undefined;
            username?: string | null | undefined;
            x_real_ip?: string | null | undefined;
        }>;
        magic_links: import("prostgles-types").TableHandler<{
            expires: number;
            id?: string | undefined;
            magic_link?: string | null | undefined;
            magic_link_used?: string | null | undefined;
            user_id: string;
        }>;
        published_methods: import("prostgles-types").TableHandler<{
            arguments?: ({
                name: string;
                type: "string" | "number" | "boolean" | "Date" | "string[]" | "number[]" | "Date[]" | "boolean[]" | "time" | "timestamp" | "time[]" | "timestamp[]";
                defaultValue?: string | undefined;
                optional?: boolean | undefined;
                allowedValues?: string[] | undefined;
            } | {
                name: string;
                type: "Lookup" | "Lookup[]";
                defaultValue?: any;
                optional?: boolean | undefined;
                lookup: {
                    table: string;
                    column: string;
                    filter?: Record<string, any> | undefined;
                    isArray?: boolean | undefined;
                    searchColumns?: string[] | undefined;
                    isFullRow?: {
                        displayColumns?: string[] | undefined;
                    } | undefined;
                    showInRowCard?: Record<string, any> | undefined;
                };
            })[] | undefined;
            connection_id?: string | null | undefined;
            description?: string | undefined;
            id?: number | undefined;
            name?: string | undefined;
            outputTable?: string | null | undefined;
            run?: string | undefined;
        }>;
        schema_version: import("prostgles-types").TableHandler<{
            id: number;
            table_config: any;
        }>;
        session_types: import("prostgles-types").TableHandler<{
            id: string;
        }>;
        sessions: import("prostgles-types").TableHandler<{
            active?: boolean | null | undefined;
            created?: string | null | undefined;
            expires: number;
            id?: string | undefined;
            id_num?: number | undefined;
            ip_address: string;
            is_connected?: boolean | null | undefined;
            is_mobile?: boolean | null | undefined;
            last_used?: string | null | undefined;
            name?: string | null | undefined;
            project_id?: string | null | undefined;
            socket_id?: string | null | undefined;
            type: string;
            user_agent?: string | null | undefined;
            user_id: string;
            user_type: string;
        }>;
        stats: import("prostgles-types").TableHandler<{
            application_name: string;
            backend_start: string;
            backend_type: string;
            backend_xid?: string | null | undefined;
            backend_xmin?: string | null | undefined;
            blocked_by?: number[] | null | undefined;
            blocked_by_num?: number | undefined;
            client_addr?: string | null | undefined;
            client_hostname?: string | null | undefined;
            client_port?: number | null | undefined;
            cmd?: string | null | undefined;
            connection_id: string;
            cpu?: number | null | undefined;
            datid?: number | null | undefined;
            datname?: string | null | undefined;
            id_query_hash?: string | null | undefined;
            mem?: number | null | undefined;
            pid: number;
            query: string;
            query_start?: string | null | undefined;
            state?: string | null | undefined;
            state_change?: string | null | undefined;
            usename?: string | null | undefined;
            usesysid?: number | null | undefined;
            wait_event?: string | null | undefined;
            wait_event_type?: string | null | undefined;
            xact_start?: string | null | undefined;
        }>;
        user_statuses: import("prostgles-types").TableHandler<{
            id: string;
        }>;
        user_types: import("prostgles-types").TableHandler<{
            id: string;
        }>;
        users: import("prostgles-types").TableHandler<{
            "2fa"?: {
                secret: string;
                recoveryCode: string;
                enabled: boolean;
            } | null | undefined;
            created?: string | null | undefined;
            has_2fa_enbled?: boolean | null | undefined;
            id?: string | undefined;
            is_online?: boolean | undefined;
            last_updated?: number | null | undefined;
            options?: {
                showStateDB?: boolean | undefined;
                hideNonSSLWarning?: boolean | undefined;
                viewedSQLTips?: boolean | undefined;
                viewedAccessInfo?: boolean | undefined;
                theme?: "dark" | "light" | "from-system" | undefined;
            } | null | undefined;
            password?: string | undefined;
            passwordless_admin?: boolean | null | undefined;
            status?: string | undefined;
            type?: string | undefined;
            username: string;
        }>;
        windows: import("prostgles-types").TableHandler<{
            closed?: boolean | null | undefined;
            columns?: any;
            created?: string | null | undefined;
            deleted?: boolean | null | undefined;
            filter?: any;
            fullscreen?: boolean | null | undefined;
            id?: string | undefined;
            last_updated: number;
            layout?: any;
            limit?: number | null | undefined;
            method_name?: string | null | undefined;
            name?: string | null | undefined;
            nested_tables?: any;
            options?: any;
            selected_sql?: string | undefined;
            show_menu?: boolean | null | undefined;
            sort?: any;
            sql?: string | undefined;
            sql_options?: {
                executeOptions?: "block" | "full" | "smallest-block" | undefined;
                errorMessageDisplay?: "both" | "tooltip" | "bottom" | undefined;
                tabSize?: number | undefined;
                lineNumbers?: "on" | "off" | undefined;
                renderMode?: "table" | "csv" | "JSON" | undefined;
                minimap?: {
                    enabled: boolean;
                } | undefined;
                acceptSuggestionOnEnter?: "on" | "off" | "smart" | undefined;
                expandSuggestionDocs?: boolean | undefined;
                maxCharsPerCell?: number | undefined;
                theme?: "vs" | "vs-dark" | "hc-black" | "hc-light" | undefined;
            } | undefined;
            table_name?: string | null | undefined;
            table_oid?: number | null | undefined;
            type?: string | null | undefined;
            user_id: string;
            workspace_id?: string | null | undefined;
        }>;
        workspaces: import("prostgles-types").TableHandler<{
            active_row?: any;
            connection_id: string;
            created?: string | null | undefined;
            deleted?: boolean | undefined;
            id?: string | undefined;
            last_updated: number;
            last_used?: string | undefined;
            layout?: any;
            name?: string | undefined;
            options?: {
                hideCounts?: boolean | undefined;
                showAllMyQueries?: boolean | undefined;
                defaultLayoutType?: "row" | "col" | "tab" | undefined;
                pinnedMenu?: boolean | undefined;
                pinnedMenuWidth?: number | undefined;
            } | undefined;
            published?: boolean | undefined;
            url_path?: string | null | undefined;
            user_id: string;
        }>;
    } & Pick<import("prostgles-server/dist/Prostgles").DBHandlerServer<{
        access_control: import("prostgles-types").TableHandler<{
            created?: string | null | undefined;
            database_id?: number | null | undefined;
            dbPermissions: {
                type: "Run SQL";
                allowSQL?: boolean | undefined;
            } | {
                type: "All views/tables";
                allowAllTables: ("select" | "insert" | "update" | "delete")[];
            } | {
                type: "Custom";
                customTables: {
                    tableName: string;
                    select?: boolean | {
                        fields: "" | string[] | "*" | Record<string, true | 1> | Record<string, false | 0>;
                        forcedFilterDetailed?: any;
                        filterFields?: "" | string[] | "*" | Record<string, true | 1> | Record<string, false | 0> | undefined;
                        orderByFields?: "" | string[] | "*" | Record<string, true | 1> | Record<string, false | 0> | undefined;
                    } | undefined;
                    update?: boolean | {
                        fields: "" | string[] | "*" | Record<string, true | 1> | Record<string, false | 0>;
                        forcedFilterDetailed?: any;
                        checkFilterDetailed?: any;
                        filterFields?: "" | string[] | "*" | Record<string, true | 1> | Record<string, false | 0> | undefined;
                        orderByFields?: "" | string[] | "*" | Record<string, true | 1> | Record<string, false | 0> | undefined;
                        forcedDataDetail?: any[] | undefined;
                        dynamicFields?: {
                            filterDetailed: any;
                            fields: "" | string[] | "*" | Record<string, true | 1> | Record<string, false | 0>;
                        }[] | undefined;
                    } | undefined;
                    insert?: boolean | {
                        fields: "" | string[] | "*" | Record<string, true | 1> | Record<string, false | 0>;
                        forcedDataDetail?: any[] | undefined;
                        checkFilterDetailed?: any;
                    } | undefined;
                    delete?: boolean | {
                        filterFields: "" | string[] | "*" | Record<string, true | 1> | Record<string, false | 0>;
                        forcedFilterDetailed?: any;
                    } | undefined;
                }[];
            };
            dbsPermissions?: {
                createWorkspaces?: boolean | undefined;
                viewPublishedWorkspaces?: {
                    workspaceIds: string[];
                } | undefined;
            } | null | undefined;
            id?: number | undefined;
            name?: string | null | undefined;
        }>;
        access_control_methods: import("prostgles-types").TableHandler<{
            access_control_id: number;
            published_method_id: number;
        }>;
        access_control_user_types: import("prostgles-types").TableHandler<{
            access_control_id: number;
            user_type: string;
        }>;
        backups: import("prostgles-types").TableHandler<{
            connection_details?: string | undefined;
            connection_id?: string | null | undefined;
            content_type?: string | undefined;
            created?: string | undefined;
            credential_id?: number | null | undefined;
            dbSizeInBytes: number;
            destination: "Local" | "Cloud" | "None (temp stream)";
            details?: any;
            dump_command: string;
            dump_logs?: string | null | undefined;
            id?: string | undefined;
            initiator?: string | null | undefined;
            last_updated?: string | undefined;
            local_filepath?: string | null | undefined;
            options: {
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
            restore_command?: string | null | undefined;
            restore_end?: string | null | undefined;
            restore_logs?: string | null | undefined;
            restore_options?: {
                command: "pg_restore" | "psql";
                format: "p" | "t" | "c";
                clean: boolean;
                newDbName?: string | undefined;
                create?: boolean | undefined;
                dataOnly?: boolean | undefined;
                noOwner?: boolean | undefined;
                numberOfJobs?: number | undefined;
                ifExists?: boolean | undefined;
                keepLogs?: boolean | undefined;
            } | undefined;
            restore_start?: string | null | undefined;
            restore_status?: {
                ok: string;
            } | {
                err: string;
            } | {
                loading: {
                    loaded: number;
                    total: number;
                };
            } | null | undefined;
            sizeInBytes?: number | null | undefined;
            status: {
                ok: string;
            } | {
                err: string;
            } | {
                loading?: {
                    loaded: number;
                    total?: number | undefined;
                } | undefined;
            };
            uploaded?: string | null | undefined;
        }>;
        connections: import("prostgles-types").TableHandler<{
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
        credential_types: import("prostgles-types").TableHandler<{
            id: string;
        }>;
        credentials: import("prostgles-types").TableHandler<{
            bucket?: string | null | undefined;
            id?: number | undefined;
            key_id: string;
            key_secret: string;
            name?: string | undefined;
            region?: string | null | undefined;
            type?: string | undefined;
            user_id?: string | null | undefined;
        }>;
        database_configs: import("prostgles-types").TableHandler<{
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
        global_settings: import("prostgles-types").TableHandler<{
            allowed_ips?: string[] | undefined;
            allowed_ips_enabled?: boolean | undefined;
            allowed_origin?: string | null | undefined;
            id?: number | undefined;
            magic_link_validity_days?: number | undefined;
            session_max_age_days?: number | undefined;
            tableConfig?: any;
            trust_proxy?: boolean | undefined;
            updated_by?: "user" | "app" | undefined;
        }>;
        links: import("prostgles-types").TableHandler<{
            closed?: boolean | null | undefined;
            created?: string | null | undefined;
            deleted?: boolean | null | undefined;
            disabled?: boolean | null | undefined;
            id?: string | undefined;
            last_updated: number;
            options: {
                type: "table";
                colorArr?: number[] | undefined;
                tablePath: {
                    table: string;
                    on: Record<string, any>[];
                }[];
            } | {
                type: "map";
                colorArr?: number[] | undefined;
                smartGroupFilter?: {
                    $and: any[];
                } | {
                    $or: any[];
                } | undefined;
                joinPath?: {
                    table: string;
                    on: Record<string, any>[];
                }[] | undefined;
                localTableName?: string | undefined;
                groupByColumn?: string | undefined;
                fromSelected?: boolean | undefined;
                sql?: string | undefined;
                columns: {
                    name: string;
                    colorArr: number[];
                }[];
            } | {
                type: "timechart";
                colorArr?: number[] | undefined;
                smartGroupFilter?: {
                    $and: any[];
                } | {
                    $or: any[];
                } | undefined;
                joinPath?: {
                    table: string;
                    on: Record<string, any>[];
                }[] | undefined;
                localTableName?: string | undefined;
                groupByColumn?: string | undefined;
                fromSelected?: boolean | undefined;
                sql?: string | undefined;
                columns: {
                    name: string;
                    colorArr: number[];
                    statType?: {
                        funcName: "$min" | "$max" | "$countAll" | "$avg" | "$sum";
                        numericColumn: string;
                    } | undefined;
                }[];
            };
            user_id: string;
            w1_id: string;
            w2_id: string;
            workspace_id?: string | null | undefined;
        }>;
        login_attempts: import("prostgles-types").TableHandler<{
            auth_type: "session-id" | "magic-link" | "login";
            created?: string | null | undefined;
            failed?: boolean | null | undefined;
            id?: number | undefined;
            info?: string | null | undefined;
            ip_address: string;
            ip_address_remote?: string | null | undefined;
            magic_link_id?: string | null | undefined;
            sid?: string | null | undefined;
            type?: "web" | "api_token" | "desktop" | "mobile" | undefined;
            user_agent?: string | null | undefined;
            username?: string | null | undefined;
            x_real_ip?: string | null | undefined;
        }>;
        magic_links: import("prostgles-types").TableHandler<{
            expires: number;
            id?: string | undefined;
            magic_link?: string | null | undefined;
            magic_link_used?: string | null | undefined;
            user_id: string;
        }>;
        published_methods: import("prostgles-types").TableHandler<{
            arguments?: ({
                name: string;
                type: "string" | "number" | "boolean" | "Date" | "string[]" | "number[]" | "Date[]" | "boolean[]" | "time" | "timestamp" | "time[]" | "timestamp[]";
                defaultValue?: string | undefined;
                optional?: boolean | undefined;
                allowedValues?: string[] | undefined;
            } | {
                name: string;
                type: "Lookup" | "Lookup[]";
                defaultValue?: any;
                optional?: boolean | undefined;
                lookup: {
                    table: string;
                    column: string;
                    filter?: Record<string, any> | undefined;
                    isArray?: boolean | undefined;
                    searchColumns?: string[] | undefined;
                    isFullRow?: {
                        displayColumns?: string[] | undefined;
                    } | undefined;
                    showInRowCard?: Record<string, any> | undefined;
                };
            })[] | undefined;
            connection_id?: string | null | undefined;
            description?: string | undefined;
            id?: number | undefined;
            name?: string | undefined;
            outputTable?: string | null | undefined;
            run?: string | undefined;
        }>;
        schema_version: import("prostgles-types").TableHandler<{
            id: number;
            table_config: any;
        }>;
        session_types: import("prostgles-types").TableHandler<{
            id: string;
        }>;
        sessions: import("prostgles-types").TableHandler<{
            active?: boolean | null | undefined;
            created?: string | null | undefined;
            expires: number;
            id?: string | undefined;
            id_num?: number | undefined;
            ip_address: string;
            is_connected?: boolean | null | undefined;
            is_mobile?: boolean | null | undefined;
            last_used?: string | null | undefined;
            name?: string | null | undefined;
            project_id?: string | null | undefined;
            socket_id?: string | null | undefined;
            type: string;
            user_agent?: string | null | undefined;
            user_id: string;
            user_type: string;
        }>;
        stats: import("prostgles-types").TableHandler<{
            application_name: string;
            backend_start: string;
            backend_type: string;
            backend_xid?: string | null | undefined;
            backend_xmin?: string | null | undefined;
            blocked_by?: number[] | null | undefined;
            blocked_by_num?: number | undefined;
            client_addr?: string | null | undefined;
            client_hostname?: string | null | undefined;
            client_port?: number | null | undefined;
            cmd?: string | null | undefined;
            connection_id: string;
            cpu?: number | null | undefined;
            datid?: number | null | undefined;
            datname?: string | null | undefined;
            id_query_hash?: string | null | undefined;
            mem?: number | null | undefined;
            pid: number;
            query: string;
            query_start?: string | null | undefined;
            state?: string | null | undefined;
            state_change?: string | null | undefined;
            usename?: string | null | undefined;
            usesysid?: number | null | undefined;
            wait_event?: string | null | undefined;
            wait_event_type?: string | null | undefined;
            xact_start?: string | null | undefined;
        }>;
        user_statuses: import("prostgles-types").TableHandler<{
            id: string;
        }>;
        user_types: import("prostgles-types").TableHandler<{
            id: string;
        }>;
        users: import("prostgles-types").TableHandler<{
            "2fa"?: {
                secret: string;
                recoveryCode: string;
                enabled: boolean;
            } | null | undefined;
            created?: string | null | undefined;
            has_2fa_enbled?: boolean | null | undefined;
            id?: string | undefined;
            is_online?: boolean | undefined;
            last_updated?: number | null | undefined;
            options?: {
                showStateDB?: boolean | undefined;
                hideNonSSLWarning?: boolean | undefined;
                viewedSQLTips?: boolean | undefined;
                viewedAccessInfo?: boolean | undefined;
                theme?: "dark" | "light" | "from-system" | undefined;
            } | null | undefined;
            password?: string | undefined;
            passwordless_admin?: boolean | null | undefined;
            status?: string | undefined;
            type?: string | undefined;
            username: string;
        }>;
        windows: import("prostgles-types").TableHandler<{
            closed?: boolean | null | undefined;
            columns?: any;
            created?: string | null | undefined;
            deleted?: boolean | null | undefined;
            filter?: any;
            fullscreen?: boolean | null | undefined;
            id?: string | undefined;
            last_updated: number;
            layout?: any;
            limit?: number | null | undefined;
            method_name?: string | null | undefined;
            name?: string | null | undefined;
            nested_tables?: any;
            options?: any;
            selected_sql?: string | undefined;
            show_menu?: boolean | null | undefined;
            sort?: any;
            sql?: string | undefined;
            sql_options?: {
                executeOptions?: "block" | "full" | "smallest-block" | undefined;
                errorMessageDisplay?: "both" | "tooltip" | "bottom" | undefined;
                tabSize?: number | undefined;
                lineNumbers?: "on" | "off" | undefined;
                renderMode?: "table" | "csv" | "JSON" | undefined;
                minimap?: {
                    enabled: boolean;
                } | undefined;
                acceptSuggestionOnEnter?: "on" | "off" | "smart" | undefined;
                expandSuggestionDocs?: boolean | undefined;
                maxCharsPerCell?: number | undefined;
                theme?: "vs" | "vs-dark" | "hc-black" | "hc-light" | undefined;
            } | undefined;
            table_name?: string | null | undefined;
            table_oid?: number | null | undefined;
            type?: string | null | undefined;
            user_id: string;
            workspace_id?: string | null | undefined;
        }>;
        workspaces: import("prostgles-types").TableHandler<{
            active_row?: any;
            connection_id: string;
            created?: string | null | undefined;
            deleted?: boolean | undefined;
            id?: string | undefined;
            last_updated: number;
            last_used?: string | undefined;
            layout?: any;
            name?: string | undefined;
            options?: {
                hideCounts?: boolean | undefined;
                showAllMyQueries?: boolean | undefined;
                defaultLayoutType?: "row" | "col" | "tab" | undefined;
                pinnedMenu?: boolean | undefined;
                pinnedMenuWidth?: number | undefined;
            } | undefined;
            published?: boolean | undefined;
            url_path?: string | null | undefined;
            user_id: string;
        }>;
    }>, "tx" | "sql">, _dbs: DB, socket?: import("prostgles-server/dist/DboBuilder").PRGLIOSocket | undefined, restartIfExists?: boolean | undefined) => Promise<string | undefined>;
}
export {};
//# sourceMappingURL=ConnectionManager.d.ts.map