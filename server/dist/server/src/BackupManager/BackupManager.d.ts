/// <reference types="node" />
/// <reference types="node" />
import type { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
import { PassThrough } from "stream";
import { InstalledPrograms } from "./getInstalledPrograms";
export declare const BACKUP_FOLDERNAME = "prostgles_backups";
export declare const BKP_PREFFIX: string;
export type Backups = Required<DBSchemaGenerated["backups"]>["columns"];
type DumpOpts = Backups["options"];
export type DumpOptsServer = DumpOpts & {
    initiator: string;
};
export type Users = Required<DBSchemaGenerated["users"]["columns"]>;
export type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
type DBS = DBOFullyTyped<DBSchemaGenerated>;
import { Request, Response } from "express";
import { SUser } from "../authConfig";
import { ConnectionManager } from "../ConnectionManager/ConnectionManager";
import { DB } from "prostgles-server/dist/Prostgles";
import { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import { SubscriptionHandler } from "prostgles-types";
export declare const HOUR: number;
export default class BackupManager {
    tempStreams: Record<string, {
        lastChunk: number;
        stream: PassThrough;
    }>;
    installedPrograms: InstalledPrograms | undefined;
    dbs: DBS;
    db: DB;
    automaticBackupInterval: NodeJS.Timeout;
    connMgr: ConnectionManager;
    dbConfSub?: SubscriptionHandler;
    constructor(db: DB, dbs: DBS, connMgr: ConnectionManager, installedPrograms: InstalledPrograms);
    getCmd: (cmd: "pg_dump" | "pg_restore" | "pg_dumpall" | "psql") => string;
    static create: (db: DB, dbs: DBS, connMgr: ConnectionManager) => Promise<BackupManager>;
    destroy(): Promise<void>;
    checkIfEnoughSpace: (conId: string) => Promise<{
        ok: boolean;
        err: string;
        diskSpace: import("check-disk-space").DiskSpace;
        dbSizeInBytes: any;
    } | {
        ok: boolean;
        diskSpace: import("check-disk-space").DiskSpace;
        dbSizeInBytes: any;
        err?: undefined;
    }>;
    getDBSizeInBytes: (conId: string) => Promise<any>;
    pgDump: (args_0: string, args_1: number | null, args_2: import("@common/utils").PGDumpParams) => Promise<string | undefined>;
    pgRestore: (arg1: {
        bkpId: string;
        connId?: string | undefined;
    }, stream: import("stream").Readable | undefined, o: {
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
    } | undefined) => Promise<void>;
    pgRestoreStream: (fileName: string, conId: string, stream: PassThrough, sizeBytes: number, restore_options: Backups["restore_options"]) => Promise<void>;
    bkpDelete: (bkpId: string, force?: boolean) => Promise<string>;
    onRequestBackupFile: (res: Response, userData: SUser | undefined, req: Request) => Promise<void>;
    timeout?: NodeJS.Timeout;
    closeStream: (streamId: string) => PassThrough;
    pushToStream: (streamId: string, chunk: any, cb: (err: any) => void) => void;
    getTempFileStream: (fileName: string, userId: string) => {
        streamId: string;
        stream: PassThrough;
    };
    getCurrentBackup: (conId: string) => Promise<Required<{
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
    }> | undefined>;
    checkAutomaticBackup: (con: Required<{
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
    }>) => Promise<void>;
}
export {};
//# sourceMappingURL=BackupManager.d.ts.map