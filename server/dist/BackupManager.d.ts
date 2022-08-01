/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { DBSchemaGenerated } from "./DBoGenerated";
import child from 'child_process';
import internal, { PassThrough, Readable } from "stream";
import FileManager from "prostgles-server/dist/FileManager";
import { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
export declare type Backups = Required<DBSchemaGenerated["backups"]>["columns"];
declare type DumpOpts = Backups["options"];
export declare type DumpOptsServer = DumpOpts & {
    initiator: string;
};
export declare type Users = Required<DBSchemaGenerated["users"]["columns"]>;
export declare type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
declare type DBS = DBOFullyTyped<DBSchemaGenerated>;
export default class BackupManager {
    private tempStreams;
    private timeout?;
    closeStream: (streamId: string) => internal.PassThrough;
    pushToStream: (streamId: string, chunk: any, cb: (err: any) => void) => void;
    getTempFileStream: (fileName: string, userId: string) => {
        streamId: string;
        stream: internal.PassThrough;
    };
    getCurrentBackup: (conId: string) => Promise<Required<{
        connection_id: string;
        content_type?: string | undefined;
        created?: Date | undefined;
        credential_id?: number | null | undefined;
        dbSizeInBytes: number;
        destination: string;
        details?: any;
        dump_command: string;
        dump_logs?: string | null | undefined;
        id?: string | undefined; /**
         * If not provided then save to current server
         */
        initiator?: string | null | undefined;
        last_updated?: Date | undefined;
        options?: {
            command: "pg_dump" | "pg_dumpall";
            clean: boolean;
            format: "p" | "c" | "t";
            dumpAll?: boolean | undefined;
            ifExists?: boolean | undefined;
            keepLogs?: boolean | undefined;
        } | undefined;
        restore_command?: string | null | undefined; /**
         * If provided then will do the backup during that hour (1-7: Mon to Sun). Unless the backup frequency is less than a day
         */
        restore_end?: Date | null | undefined;
        restore_logs?: string | null | undefined;
        restore_options?: {
            clean: boolean;
            create?: boolean | undefined;
            dataOnly?: boolean | undefined;
            noOwner?: boolean | undefined;
            newDbName?: string | undefined;
            command: "pg_restore" | "psql";
            format: "p" | "c" | "t";
            ifExists?: boolean | undefined;
            /**
             * If provided then will keep the latest N backups and delete the older ones
             */
            keepLogs?: boolean | undefined;
        } | undefined;
        restore_start?: Date | null | undefined;
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
        status?: {
            ok: string;
        } | {
            err: string;
        } | {
            loading?: {
                loaded: number;
                total: number;
            } | undefined;
        } | undefined;
        uploaded?: Date | null | undefined;
    }> | undefined>;
    private dbs;
    interval: NodeJS.Timeout;
    constructor(dbs: DBS);
    destroy(): Promise<void>;
    private checkIfEnoughSpace;
    private getDBSizeInBytes;
    pgDump: (conId: string, credId: number | null, dumpOpts: DumpOptsServer) => Promise<string | undefined>;
    pgRestore: (bkpId: string, stream: Readable | undefined, restore_options: Backups["restore_options"]) => Promise<void>;
    pgRestoreStream: (fileName: string, conId: string, stream: PassThrough, sizeBytes: number, restore_options: Backups["restore_options"]) => Promise<void>;
    bkpDelete: (bkpId: string, force?: boolean) => Promise<string>;
}
export declare const BACKUP_FOLDERNAME = "prostgles_backups";
export declare function getFileMgr(dbs: DBS, credId: number | null): Promise<{
    fileMgr: FileManager;
    cred: Required<{
        bucket?: string | null | undefined;
        id?: number | undefined;
        key_id: string;
        key_secret: string;
        name?: string | undefined;
        region?: string | null | undefined;
        type: string;
        user_id?: string | null | undefined;
    }> | undefined;
}>;
export declare function pipeFromCommand(command: string, opts: string[], destination: internal.Writable, onEnd: (err?: any) => void, onStdout?: (data: any, isStdErr?: boolean) => void, useExec?: boolean): child.ChildProcess;
export declare function pipeToCommand(command: string, opts: string[], source: internal.Readable, onEnd: (err?: any) => void, onStdout?: (data: any, isStdErr?: boolean) => void, useExed?: boolean): child.ChildProcess;
export {};
//# sourceMappingURL=BackupManager.d.ts.map