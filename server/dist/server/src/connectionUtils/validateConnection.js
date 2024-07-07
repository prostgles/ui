"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConnection = void 0;
const connection_string_1 = require("connection-string");
const getDefaults = (c) => ({
    db_host: c.db_host ?? "localhost",
    db_name: c.db_name ?? "postgres",
    db_user: c.db_user ?? "postgres",
    db_port: c.db_port ?? 5432,
    db_ssl: c.db_ssl ?? "prefer",
});
const validateConnection = (rawConnection) => {
    const result = { ...rawConnection };
    if (rawConnection.type === "Connection URI") {
        const db_conn = rawConnection.db_conn || (0, exports.validateConnection)({
            ...result,
            ...getDefaults(result),
            type: "Standard",
        }).db_conn;
        const cs = new connection_string_1.ConnectionString(db_conn);
        const params = cs.params ?? {};
        const { sslmode, host, port, dbname, user, password, } = params;
        const { db_host, db_port, db_user, db_name, db_ssl } = getDefaults({
            db_host: cs.hosts?.[0]?.name || host,
            db_port: cs.hosts?.[0]?.port || +port,
            db_user: cs.user ?? (user || "postgres"),
            db_name: cs.path?.join("/") ?? dbname,
            db_ssl: sslmode
        });
        const validated = {
            ...rawConnection,
            db_conn,
            db_host,
            db_port,
            db_user,
            db_name,
            db_ssl,
            db_pass: cs.password ?? password
        };
        return validated;
    }
    else if (rawConnection.type === "Standard" || rawConnection.db_host) {
        const { db_host, db_port, db_user, db_name, db_ssl, db_pass } = {
            ...getDefaults(rawConnection),
            ...rawConnection,
        };
        const cs = new connection_string_1.ConnectionString(null, { protocol: "postgres" });
        cs.hosts = [{
                name: db_host,
                port: db_port
            }];
        cs.password = db_pass ?? undefined;
        cs.user = db_user;
        cs.path = [db_name];
        cs.params = { sslmode: rawConnection.db_ssl ?? "prefer" };
        const db_conn = cs.toString();
        const validated = {
            ...rawConnection,
            db_host,
            db_port,
            db_user,
            db_name,
            db_ssl,
            db_conn,
            db_pass: rawConnection.db_pass ?? undefined
        };
        return validated;
    }
    else {
        throw "Not supported";
    }
};
exports.validateConnection = validateConnection;
//# sourceMappingURL=validateConnection.js.map