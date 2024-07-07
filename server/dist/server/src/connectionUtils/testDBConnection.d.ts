import type { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
import { type ConnectionInfo } from "./validateConnection";
export type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
import pgPromise from "pg-promise";
import type pg from "pg-promise/typescript/pg-subset";
/**
 * Ensures sslmode=prefer is supported
 * https://www.postgresql.org/docs/8.4/libpq-connect.html#LIBPQ-CONNECT-SSLMODE
 * https://github.com/brianc/node-postgres/issues/2720
 *
 *  disable	    only try a non-SSL connection
 *  allow	      first try a non-SSL connection; if that fails, try an SSL connection
 *  prefer      (default)	first try an SSL connection; if that fails, try a non-SSL connection
 *  require	    only try an SSL connection. If a root CA file is present, verify the certificate in the same way as if verify-ca was specified
 *  verify-ca	  only try an SSL connection, and verify that the server certificate is issued by a trusted CA.
 *  verify-full	only try an SSL connection, verify that the server certificate is issued by a trusted CA and that the server hostname matches that in the certificate.
 */
export declare const testDBConnection: (_c: ConnectionInfo, expectSuperUser?: boolean, check?: (c: pgPromise.IConnected<{}, pg.IClient>) => any) => Promise<{
    prostglesSchemaVersion: string | undefined;
    connectionInfo: pg.IConnectionParameters<pg.IClient>;
    canCreateDb: boolean | undefined;
    isSSLModeFallBack?: boolean;
}>;
export declare const getDbConnection: (_c: DBSchemaGenerated["connections"]["columns"], opts?: pg.IConnectionParameters<pg.IClient>) => Promise<pgPromise.IDatabase<{}, pg.IClient>>;
//# sourceMappingURL=testDBConnection.d.ts.map