import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import type { PRGLIOSocket } from "prostgles-server/dist/DboBuilder";
import { type DB } from "prostgles-server/dist/Prostgles";
import type { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import type { ConnectionManager, User } from "./ConnectionManager";
export declare const startConnection: (this: ConnectionManager, con_id: string, dbs: DBOFullyTyped<DBSchemaGenerated>, _dbs: DB, socket?: PRGLIOSocket, restartIfExists?: boolean) => Promise<string | undefined>;
export declare const getACRule: (dbs: DBOFullyTyped<DBSchemaGenerated>, user: User | undefined, database_id: number) => Promise<DBSSchema["access_control"] | undefined>;
//# sourceMappingURL=startConnection.d.ts.map