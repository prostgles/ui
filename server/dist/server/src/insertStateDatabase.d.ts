import type { DB } from "prostgles-server/dist/Prostgles";
import type { DBS } from ".";
import type { DBSConnectionInfo } from "./electronConfig";
/** Add state db if missing */
export declare const insertStateDatabase: (db: DBS, _db: DB, con: DBSConnectionInfo | Partial<DBSConnectionInfo>) => Promise<void>;
//# sourceMappingURL=insertStateDatabase.d.ts.map