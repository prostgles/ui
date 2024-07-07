import type { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
export type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
import type pg from "pg-promise/typescript/pg-subset";
type ConnectionDetails = Required<Pick<pg.IConnectionParameters<pg.IClient>, "application_name" | "host" | "port" | "password" | "user" | "ssl" | "database">> & {
    password: string;
};
export declare const getConnectionDetails: (c: Connections) => ConnectionDetails;
export {};
//# sourceMappingURL=getConnectionDetails.d.ts.map