import { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
export declare type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
import pg from "pg-promise/typescript/pg-subset";
export declare const getConnectionDetails: (c: Connections) => Required<Pick<pg.IConnectionParameters<pg.IClient>, "application_name" | "host" | "port" | "password" | "user" | "ssl" | "database">> & {
    password: string;
};
//# sourceMappingURL=getConnectionDetails.d.ts.map