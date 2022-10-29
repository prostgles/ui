/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import type { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import child from 'child_process';
import internal, { PassThrough, Readable } from "stream";
import FileManager from "prostgles-server/dist/FileManager";
import { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
export declare const BACKUP_FOLDERNAME = "prostgles_backups";
export declare const BKP_PREFFIX: string;
export declare type Backups = Required<DBSchemaGenerated["backups"]>["columns"];
declare type DumpOpts = Backups["options"];
export declare type DumpOptsServer = DumpOpts & {
    initiator: string;
};
export declare type Users = Required<DBSchemaGenerated["users"]["columns"]>;
export declare type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
declare type DBS = DBOFullyTyped<DBSchemaGenerated>;
import { Request, Response } from "express";
import { SUser } from "./authConfig";
import { ConnectionManager } from "./ConnectionManager";
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
        connection_details?: string | undefined;
        connection_id?: string | null | undefined;
        content_type?: string | undefined;
        created?: Date | undefined;
        credential_id?: number | null | undefined;
        dbSizeInBytes: number;
        destination: string;
        details?: any;
        dump_command: string;
        dump_logs?: string | null | undefined;
        id?: string | undefined;
        initiator?: string | null | undefined;
        last_updated?: Date | undefined;
        options?: {
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
            format: "p" | "c" | "t";
            dataOnly?: boolean | undefined;
            clean?: boolean | undefined;
            create?: boolean | undefined;
            encoding?: string | undefined;
            numberOfJobs?: number | undefined;
            noOwner?: boolean | undefined;
            compressionLevel?: number | undefined;
            ifExists?: boolean | undefined;
            keepLogs?: boolean | undefined;
        } | undefined;
        restore_command?: string | null | undefined;
        restore_end?: Date | null | undefined;
        restore_logs?: string | null | undefined;
        restore_options?: {
            command: "pg_restore" | "psql";
            format: "p" | "c" | "t";
            clean: boolean;
            newDbName?: string | undefined;
            create?: boolean | undefined;
            dataOnly?: boolean | undefined;
            noOwner?: boolean | undefined;
            numberOfJobs?: number | undefined;
            ifExists?: boolean | undefined;
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
    connMgr: ConnectionManager;
    constructor(dbs: DBS, connMgr: ConnectionManager);
    destroy(): Promise<void>;
    private checkIfEnoughSpace;
    private getDBSizeInBytes;
    pgDump: (conId: string, credId: number | null, o: DumpOptsServer) => Promise<string | undefined>;
    pgRestore: (arg1: {
        bkpId: string;
        connId?: string;
    }, stream: Readable | undefined, o: Backups["restore_options"]) => Promise<void>;
    pgRestoreStream: (fileName: string, conId: string, stream: PassThrough, sizeBytes: number, restore_options: Backups["restore_options"]) => Promise<void>;
    bkpDelete: (bkpId: string, force?: boolean) => Promise<string>;
    onRequestBackupFile: (res: Response, userData: SUser | undefined, req: Request) => Promise<void>;
}
export declare function getFileMgr(dbs: DBS, credId: number | null): Promise<{
    fileMgr: FileManager;
    cred: Required<{
        bucket: string;
        id?: number | undefined;
        key_id: string;
        key_secret: string;
        name: string;
        region?: string | null | undefined;
        type?: string | undefined;
        user_id?: string | null | undefined;
    }> | undefined;
}>;
declare type EnvVars = Record<string, string> | {};
export declare function pipeFromCommand(command: string, opts: string[], envVars: EnvVars | undefined, destination: internal.Writable, onEnd: (err?: any) => void, onStdout?: (data: any, isStdErr?: boolean) => void, useExec?: boolean): child.ChildProcess;
export declare function pipeToCommand(command: string, opts: string[], envVars: EnvVars | undefined, source: internal.Readable, onEnd: (err?: any) => void, onStdout?: (data: any, isStdErr?: boolean) => void, useExec?: boolean): child.ChildProcess;
export {};
//# sourceMappingURL=BackupManager.d.ts.map