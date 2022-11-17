import { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
export type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
export declare const testDBConnection: (_c: DBSchemaGenerated["connections"]["columns"], expectSuperUser?: boolean) => Promise<true>;
//# sourceMappingURL=testDBConnection.d.ts.map