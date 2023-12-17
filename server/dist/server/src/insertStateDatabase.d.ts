import { DB } from "prostgles-server/dist/Prostgles";
import { DBS } from ".";
import { DBSConnectionInfo } from "./electronConfig";
/** Add state db if missing */
export declare const insertStateDatabase: (db: DBS, _db: DB, con: DBSConnectionInfo) => Promise<void>;
//# sourceMappingURL=insertStateDatabase.d.ts.map