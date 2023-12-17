"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnectionDetails = void 0;
const connection_string_1 = require("connection-string");
const getConnectionDetails = (c) => {
    /**
     * Cannot use connection uri without having ssl issues
     * https://github.com/brianc/node-postgres/issues/2281
     */
    const getSSLOpts = (sslmode) => sslmode && sslmode !== "disable" ? ({
        ca: c.ssl_certificate ?? undefined,
        cert: c.ssl_client_certificate ?? undefined,
        key: c.ssl_client_certificate_key ?? undefined,
        rejectUnauthorized: c.ssl_reject_unauthorized ?? (sslmode === "require" && !!c.ssl_certificate || sslmode === "verify-ca" || sslmode === "verify-full")
    }) : undefined;
    const default_application_name = "prostgles";
    if (c.type === "Connection URI") {
        const cs = new connection_string_1.ConnectionString(c.db_conn);
        const params = cs.params ?? {};
        const { sslmode, application_name = default_application_name } = params;
        return {
            // connectionString: c.db_conn,
            application_name,
            host: cs.hosts[0]?.name,
            port: cs.hosts[0]?.port,
            user: cs.user,
            password: cs.password,
            database: cs.path[0],
            ssl: getSSLOpts(sslmode) ?? false,
        };
    }
    return {
        application_name: default_application_name,
        database: c.db_name,
        user: c.db_user,
        password: c.db_pass,
        host: c.db_host,
        port: c.db_port,
        ssl: getSSLOpts(c.db_ssl) ?? false,
    };
};
exports.getConnectionDetails = getConnectionDetails;
//# sourceMappingURL=getConnectionDetails.js.map