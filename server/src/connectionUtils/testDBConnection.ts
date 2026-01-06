import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { getConnectionDetails } from "./getConnectionDetails";
import { validateConnection, type ConnectionInfo } from "./validateConnection";
export type Connections = Required<DBGeneratedSchema["connections"]["columns"]>;

import pgPromise from "pg-promise";
import type pg from "pg-promise/typescript/pg-subset";
import { getIsSuperUser, type DBorTx } from "prostgles-server/dist/Prostgles";
import { getSerialisableError, isObject, tryCatchV2 } from "prostgles-types";
const pgpNoWarnings = pgPromise({ noWarnings: true });
const pgp = pgPromise();

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
export const testDBConnection = (
  _c: ConnectionInfo,
  expectSuperUser = false,
  check?: (c: pgPromise.IConnected<{}, pg.IClient>) => any,
): Promise<{
  prostglesSchemaVersion: string | undefined;
  connectionInfo: pg.IConnectionParameters<pg.IClient>;
  canCreateDb: boolean | undefined;
  isSSLModeFallBack?: boolean;
}> => {
  const con = validateConnection(_c);
  if (typeof con !== "object" || (!("db_host" in con) && !("db_conn" in con))) {
    throw (
      "Incorrect database connection info provided. " +
      "\nExpecting: \
      db_conn: string; \
      OR \
      db_user: string; db_pass: string; db_host: string; db_port: number; db_name: string, db_ssl: string"
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  return new Promise(async (resolve, reject) => {
    const connOpts = getConnectionDetails(con as Connections);
    const db = pgpNoWarnings({ ...connOpts });
    return db
      .connect()
      .then(async function (c) {
        if (expectSuperUser) {
          const usessuper = await getIsSuperUser(c as unknown as DBorTx);
          if (!usessuper) {
            reject(new Error("Provided user must be a superuser"));
            return;
          }
        }
        await check?.(c);

        const { data: prostglesSchemaVersion } = await tryCatchV2(async () => {
          const { version } = await c.one<{ version: string }>(
            "SELECT version FROM prostgles.versions",
          );
          return version;
        });
        const { data: canCreateDb } = await tryCatchV2(async () => {
          const { can_create_db } = await c.one<{ can_create_db: boolean }>(`
            SELECT rolcreatedb OR rolsuper as can_create_db
            FROM pg_catalog.pg_roles
            WHERE rolname = "current_user"();
          `);
          return can_create_db;
        });

        resolve({
          connectionInfo: connOpts,
          prostglesSchemaVersion,
          canCreateDb,
        });

        await c.done();
      })
      .catch((err) => {
        const errRes = err instanceof Error ? err.message : JSON.stringify(err);
        if (errRes === NO_SSL_SUPPORT_ERROR && _c.db_ssl === "prefer") {
          console.warn(
            `Falling back to sslmode=disable for host ${con.db_host} as sslmode=prefer is not supported by the server.`,
          );
          return resolve(
            testDBConnection(
              {
                ..._c,
                db_ssl: "disable",
                type: "Standard",
              },
              (expectSuperUser = false),
              check,
            ).then((res) => ({ ...res, isSSLModeFallBack: true })),
          );
        } else {
          console.error(
            `Error connecting to database ${JSON.stringify(con.db_host)}`,
            err,
          );
        }
        const localHosts = [
          "host.docker.internal",
          "localhost",
          "127.0.0.1",
          "172.17.0.1",
        ];

        let prostgles_error_hint = "";
        if (process.env.IS_DOCKER && localHosts.includes(con.db_host)) {
          prostgles_error_hint = [
            `\nTo connect to a localhost database from docker you need to either use "host" netoworking mode or:\n `,
            `1) If using docker-compose.yml, uncomment extra_hosts:  `,
            `  extra_hosts:`,
            `    - "host.docker.internal:host-gateway"`,
            `2) Ensure the target database postgresql.conf contains either:`,
            `  listen_addresses = 'localhost,172.17.0.1'`,
            `  OR a more permissive setting like:`,
            `  listen_addresses = '*'`,
            `3) Ensure the target database pg_hba.conf contains:`,
            `  host  all   all   172.17.0.0/16  md5`,
            `4) Restart the postgresql server to apply the changes.`,
            `5) Ensure the user you connect with has an encrypted password. `,
            `6) Use "172.17.0.1" or "host.docker.internal" instead of "localhost" in the above connection details`,
          ].join("\n");
        }
        const serialisableError = getSerialisableError(err);
        const removeUndefined = (obj: Record<string, unknown>) => {
          return Object.fromEntries(
            Object.entries(obj).filter(([_, v]) => v !== undefined),
          );
        };
        reject(
          removeUndefined(
            isObject(serialisableError) ?
              { ...serialisableError, prostgles_error_hint }
            : { error: serialisableError, prostgles_error_hint },
          ),
        );
      });
  });
};

export const getDbConnection = async (
  _c: DBGeneratedSchema["connections"]["columns"],
  opts?: pg.IConnectionParameters<pg.IClient>,
): Promise<pgPromise.IDatabase<{}, pg.IClient>> => {
  const { connectionInfo } = await testDBConnection(_c);
  const db = pgp({ ...connectionInfo, ...opts, allowExitOnIdle: true });
  return db;
};
