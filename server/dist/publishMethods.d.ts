import { PublishMethods } from "prostgles-server/dist/PublishParser";
import { DBSchemaGenerated } from "./DBoGenerated";
export declare type Users = Required<DBSchemaGenerated["users"]["columns"]>;
export declare type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
import BackupManager from "./BackupManager";
export declare let bkpManager: BackupManager;
export declare const publishMethods: PublishMethods<DBSchemaGenerated>;
//# sourceMappingURL=publishMethods.d.ts.map