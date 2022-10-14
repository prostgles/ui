"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDBConnection = void 0;
const getConnectionDetails_1 = require("./getConnectionDetails");
const validateConnection_1 = require("./validateConnection");
const Prostgles_1 = require("prostgles-server/dist/Prostgles");
const pg_promise_1 = __importDefault(require("pg-promise"));
const pgp = (0, pg_promise_1.default)();
const testDBConnection = (_c, expectSuperUser = false) => {
    const con = (0, validateConnection_1.validateConnection)(_c);
    if (typeof con !== "object" || !("db_host" in con) && !("db_conn" in con)) {
        throw "Incorrect database connection info provided. " +
            "\nExpecting: \
      db_conn: string; \
      OR \
      db_user: string; db_pass: string; db_host: string; db_port: number; db_name: string, db_ssl: string";
    }
    // console.log(db_conn)
    return new Promise(async (resolve, reject) => {
        let connOpts = (0, getConnectionDetails_1.getConnectionDetails)(con);
        const db = pgp({ ...connOpts, connectionTimeoutMillis: 1000 });
        db.connect()
            .then(async function (c) {
            // console.log(connOpts, "success, release connectio ", await db.any("SELECT current_database(), current_user, (select usesuper from pg_user where usename = CURRENT_USER)"))
            if (expectSuperUser) {
                const usessuper = await (0, Prostgles_1.isSuperUser)(c);
                if (!usessuper) {
                    reject("Provided user must be a superuser");
                    return;
                }
            }
            await c.done(); // success, release connection;
            resolve(true);
        }).catch(err => {
            let errRes = err instanceof Error ? err.message : JSON.stringify(err);
            if (process.env.IS_DOCKER) {
                if (con.db_host === "localhost" || con.db_host === "127.0.0.1") {
                    errRes += `\nHint: to connect to a localhost database from docker you need to:\n ` +
                        `1) Uncomment extra_hosts in docker-compose.yml:  
    extra_hosts:
      - "host.docker.internal:host-gateway"
 2) postgresql.conf contains:
    listen_addresses = '*'
 3) pg_hba.conf contains:
    host  all   all   0.0.0.0/0 md5
 4) Ensure the user you connect with has an encrypted password. 
 5) use "host.docker.internal" instead of "localhost" in the above connection details
`;
                }
            }
            // console.error("testDBConnection fail", {err, connOpts, con})
            reject(errRes);
        });
        /**
         * Used to prevent connecting to localhost or internal networks
         */
        // dns.lookup(host, function(err, result) {
        //   if(err) return reject(err);
        //   else if(["127.0.0.1"].includes(result)){
        //     return reject("localhost not allowed");
        //   } else {
        //     resolve(pgp({ user: username, password, host, port, databse, ssl }).connect());
        //   }
        // });
    });
};
exports.testDBConnection = testDBConnection;
//# sourceMappingURL=testDBConnection.js.map