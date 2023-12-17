/// <reference types="node" />
import { Readable } from "stream";
import BackupManager, { Backups } from "./BackupManager";
export declare function pgRestore(this: BackupManager, arg1: {
    bkpId: string;
    connId?: string;
}, stream: Readable | undefined, o: Backups["restore_options"]): Promise<void>;
//# sourceMappingURL=pgRestore.d.ts.map