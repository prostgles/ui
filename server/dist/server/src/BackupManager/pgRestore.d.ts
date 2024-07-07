/// <reference types="node" />
import type { Readable } from "stream";
import type { Backups } from "./BackupManager";
import type BackupManager from "./BackupManager";
export declare function pgRestore(this: BackupManager, arg1: {
    bkpId: string;
    connId?: string;
}, stream: Readable | undefined, o: Backups["restore_options"]): Promise<void>;
//# sourceMappingURL=pgRestore.d.ts.map