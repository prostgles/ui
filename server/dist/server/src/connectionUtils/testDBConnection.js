"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDbConnection = exports.testDBConnection = void 0;
const getConnectionDetails_1 = require("./getConnectionDetails");
const validateConnection_1 = require("./validateConnection");
const Prostgles_1 = require("prostgles-server/dist/Prostgles");
const pg_promise_1 = __importDefault(require("pg-promise"));
const pgpNoWarnings = (0, pg_promise_1.default)({ noWarnings: true });
const pgp = (0, pg_promise_1.default)();
const prostgles_types_1 = require("prostgles-types");
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
const testDBConnection = (_c, expectSuperUser = false, check) => {
    const con = (0, validateConnection_1.validateConnection)(_c);
    if (typeof con !== "object" || !("db_host" in con) && !("db_conn" in con)) {
        throw "Incorrect database connection info provided. " +
            "\nExpecting: \
      db_conn: string; \
      OR \
      db_user: string; db_pass: string; db_host: string; db_port: number; db_name: string, db_ssl: string";
    }
    return new Promise(async (resolve, reject) => {
        const connOpts = (0, getConnectionDetails_1.getConnectionDetails)(con);
        const db = pgpNoWarnings({ ...connOpts, connectionTimeoutMillis: 1000 });
        db.connect()
            .then(async function (c) {
            if (expectSuperUser) {
                const usessuper = await (0, Prostgles_1.isSuperUser)(c);
                if (!usessuper) {
                    reject("Provided user must be a superuser");
                    return;
                }
            }
            await check?.(c);
            const { prostglesSchemaVersion } = await (0, prostgles_types_1.tryCatch)(async () => {
                const prostglesSchemaVersion = (await c.oneOrNone("SELECT version FROM prostgles.versions")).version;
                return { prostglesSchemaVersion };
            });
            const { canCreateDb } = await (0, prostgles_types_1.tryCatch)(async () => {
                const canCreateDb = (await c.oneOrNone(`
            SELECT rolcreatedb OR rolsuper as can_create_db
            FROM pg_catalog.pg_roles
            WHERE rolname = "current_user"();
          `)).can_create_db;
                return { canCreateDb };
            });
            resolve({ connectionInfo: connOpts, prostglesSchemaVersion, canCreateDb });
            await c.done();
        }).catch(err => {
            let errRes = err instanceof Error ? err.message : JSON.stringify(err);
            if (errRes === NO_SSL_SUPPORT_ERROR && _c.db_ssl === "prefer") {
                return resolve((0, exports.testDBConnection)({
                    ..._c,
                    db_ssl: "disable",
                    type: "Standard",
                }, expectSuperUser = false, check)
                    .then(res => ({ ...res, isSSLModeFallBack: true })));
            }
            if (process.env.IS_DOCKER && (con.db_host === "localhost" || con.db_host === "127.0.0.1")) {
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
            reject(errRes);
        });
    });
};
exports.testDBConnection = testDBConnection;
const getDbConnection = async (_c, opts) => {
    const { connectionInfo } = await (0, exports.testDBConnection)(_c);
    const db = pgp({ ...connectionInfo, ...opts, allowExitOnIdle: true });
    return db;
};
exports.getDbConnection = getDbConnection;
//# sourceMappingURL=testDBConnection.js.map