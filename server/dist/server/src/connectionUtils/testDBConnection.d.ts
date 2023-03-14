import { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
export type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
import pgPromise from 'pg-promise';
import pg from "pg-promise/typescript/pg-subset";
export declare const testDBConnection: (_c: DBSchemaGenerated["connections"]["columns"], expectSuperUser?: boolean, check?: ((c: pgPromise.IConnected<{}, pg.IClient>) => any) | undefined) => Promise<{
    prostglesSchemaVersion?: string;
}>;
//# sourceMappingURL=testDBConnection.d.ts.map