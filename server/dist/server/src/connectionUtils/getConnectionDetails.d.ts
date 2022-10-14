import { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
export declare type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
import pg from "pg-promise/typescript/pg-subset";
export declare const getConnectionDetails: (c: Connections) => pg.IConnectionParameters<pg.IClient>;
//# sourceMappingURL=getConnectionDetails.d.ts.map