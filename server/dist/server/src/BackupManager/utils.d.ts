import type { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
import { FileManager } from "prostgles-server/dist/FileManager/FileManager";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import type { ConnectionManager } from "../ConnectionManager/ConnectionManager";
import type { EnvVars } from "./pipeFromCommand";
import type { Connections, DBS } from "..";
export declare const getConnectionUri: (c: Connections) => string;
export declare function getFileMgr(dbs: DBS, credId: number | null): Promise<{
    fileMgr: FileManager;
    cred: Required<{
        bucket?: string | null | undefined;
        id?: number | undefined;
        key_id: string;
        key_secret: string;
        name?: string | undefined;
        region?: string | null | undefined;
        type?: string | undefined;
        user_id?: string | null | undefined;
    }> | undefined;
}>;
export declare function getBkp(dbs: DBOFullyTyped<DBSchemaGenerated>, bkpId: string): Promise<{
    bkp: Required<{
        connection_details?: string | undefined;
        connection_id?: string | null | undefined;
        content_type?: string | undefined;
        created?: string | undefined;
        credential_id?: number | null | undefined;
        dbSizeInBytes: string;
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
        sizeInBytes?: string | null | undefined;
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
    cred: Required<{
        bucket?: string | null | undefined;
        id?: number | undefined;
        key_id: string;
        key_secret: string;
        name?: string | undefined;
        region?: string | null | undefined;
        type?: string | undefined;
        user_id?: string | null | undefined;
    }> | undefined;
    fileMgr: FileManager;
}>;
export declare function bytesToSize(bytes: number): string;
export declare function getSSLEnvVars(c: Connections, connMgr: ConnectionManager): EnvVars;
type Basics = string | number | boolean;
export declare function addOptions(opts: string[], extra: [add: boolean | undefined, val: Basics | Basics[]][]): string[];
type ConnectionEnvVars = {
    PGHOST: string;
    PGPORT: string;
    PGDATABASE: string;
    PGUSER: string;
    PGPASSWORD: string;
};
export declare const getConnectionEnvVars: (c: Connections) => ConnectionEnvVars;
export declare const makeLogs: (newLogs: string, oldLogs: string | null | undefined, startTimeStr: string | undefined) => string;
export {};
//# sourceMappingURL=utils.d.ts.map