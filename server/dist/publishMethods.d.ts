import { PublishMethods } from "prostgles-server/dist/PublishParser";
import { DBSchemaGenerated } from "./DBoGenerated";
import FileManager from "prostgles-server/dist/FileManager";
import { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
export declare type Users = Required<DBSchemaGenerated["users"]["columns"]>;
export declare type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
declare type DBS = DBOFullyTyped<DBSchemaGenerated>;
export declare const publishMethods: PublishMethods<DBSchemaGenerated>;
export declare const BACKUP_FOLDERNAME = "prostgles_backups";
export declare function getFileMgr(dbs: DBS, credId: number | null): Promise<{
    fileMgr: FileManager;
    cred: Required<{
        bucket?: string | null | undefined;
        connection_id: string;
        id?: number | undefined;
        key_id: string;
        key_secret: string;
        name?: string | undefined;
        region?: string | null | undefined;
        type: string;
        user_id?: string | null | undefined;
    }> | undefined;
}>;
export {};
//# sourceMappingURL=publishMethods.d.ts.map