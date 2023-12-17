import { getConnectionDetails } from "./getConnectionDetails";
import { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
import { validateConnection } from "./validateConnection";
export type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
import { isSuperUser } from 'prostgles-server/dist/Prostgles';

import pgPromise from 'pg-promise';
const pgpNoWarnings = pgPromise({ noWarnings: true });
const pgp = pgPromise();
import pg from "pg-promise/typescript/pg-subset";
import { tryCatch } from "prostgles-types";

const NO_SSL_SUPPORT_ERROR = "The server does not support SSL connections";

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
export const testDBConnection = (_c: DBSchemaGenerated["connections"]["columns"], expectSuperUser = false, check?: (c: pgPromise.IConnected<{}, pg.IClient>) => any): Promise<{ 
  prostglesSchemaVersion: string | undefined; 
  connectionInfo: pg.IConnectionParameters<pg.IClient>;
  canCreateDb: boolean | undefined;
  isSSLModeFallBack?: boolean;
}> => {

  const con = validateConnection(_c);
  if(typeof con !== "object" || !("db_host" in con) && !("db_conn" in con)) {
    throw "Incorrect database connection info provided. " + 
    "\nExpecting: \
      db_conn: string; \
      OR \
      db_user: string; db_pass: string; db_host: string; db_port: number; db_name: string, db_ssl: string";
  }

  return new Promise(async (resolve, reject) => {
    const connOpts = getConnectionDetails(con as any);
    const db = pgpNoWarnings({ ...connOpts, connectionTimeoutMillis: 1000 });
    db.connect()
      .then(async function (c: pgPromise.IConnected<{}, pg.IClient>) {
        
        if(expectSuperUser){
          const usessuper = await isSuperUser(c as any);
          if(!usessuper){
            reject("Provided user must be a superuser");
            return 
          }
        }
        await check?.(c);
        
        const { prostglesSchemaVersion } = await tryCatch(async () => {
          const prostglesSchemaVersion = (await c.oneOrNone("SELECT version FROM prostgles.versions")).version as string;
          return { prostglesSchemaVersion };
        });
        const { canCreateDb } = await tryCatch(async () => {
          const canCreateDb = (await c.oneOrNone(`
            SELECT rolcreatedb OR rolsuper as can_create_db
            FROM pg_catalog.pg_roles
            WHERE rolname = "current_user"();
          `)).can_create_db as boolean;
          return { canCreateDb };
        });
        
        
        resolve({ connectionInfo: connOpts, prostglesSchemaVersion, canCreateDb });

        await c.done();
      }).catch(err => {
        let errRes = err instanceof Error? err.message : JSON.stringify(err);
        if(errRes === NO_SSL_SUPPORT_ERROR && _c.db_ssl === "prefer"){
          return resolve(testDBConnection({
                ..._c, 
                db_ssl: "disable",
                type: "Standard", 
              }, 
              expectSuperUser = false, 
              check
            )
            .then(res => ({ ...res, isSSLModeFallBack: true })));
        }
        if(process.env.IS_DOCKER && (con.db_host === "localhost" || con.db_host === "127.0.0.1")){
          errRes += [
            `\nHint: to connect to a localhost database from docker you need to:\n `,
            `1) Uncomment extra_hosts in docker-compose.yml:  `,
            `  extra_hosts:`,
            `    - "host.docker.internal:host-gateway"`,
            `2) postgresql.conf contains:`,
            `  listen_addresses = '*'`,
            `3) pg_hba.conf contains:`,
            `  host  all   all   0.0.0.0/0 md5`,
            `4) Ensure the user you connect with has an encrypted password. `,
            `5) use "host.docker.internal" instead of "localhost" in the above connection details`,
          ].join("\n");
        }
        reject(errRes)
      });
  });
}

export const getDbConnection = async (
  _c: DBSchemaGenerated["connections"]["columns"], 
  opts?: pg.IConnectionParameters<pg.IClient>
): Promise<pgPromise.IDatabase<{}, pg.IClient>> => {
  const { connectionInfo } = await testDBConnection(_c);
  const db = pgp({ ...connectionInfo, ...opts, allowExitOnIdle: true });
  return db;
}