import { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import { PRGLIOSocket } from "prostgles-server/dist/DboBuilder";
import { DB } from "prostgles-server/dist/Prostgles";
import { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
import { DBSSchema } from "../../../commonTypes/publishUtils";
import { ConnectionManager, User } from "./ConnectionManager";
export declare const startConnection: (this: ConnectionManager, con_id: string, dbs: DBOFullyTyped<DBSchemaGenerated>, _dbs: DB, socket?: PRGLIOSocket, restartIfExists?: boolean) => Promise<string | undefined>;
export declare const getACRule: (dbs: DBOFullyTyped<DBSchemaGenerated>, user: User, database_id: number) => Promise<DBSSchema["access_control"] | undefined>;
//# sourceMappingURL=startConnection.d.ts.map