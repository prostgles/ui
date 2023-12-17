"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertConnection = void 0;
const PubSubManager_1 = require("prostgles-server/dist/PubSubManager/PubSubManager");
const testDBConnection_1 = require("./connectionUtils/testDBConnection");
const validateConnection_1 = require("./connectionUtils/validateConnection");
const upsertConnection = async (con, user_id, dbs) => {
    const c = (0, validateConnection_1.validateConnection)({
        ...con,
        user_id,
        last_updated: Date.now()
    });
    const { canCreateDb } = await (0, testDBConnection_1.testDBConnection)(con);
    try {
        let connection;
        if (con.id) {
            if (!(await dbs.connections.findOne({ id: con.id }))) {
                throw "Connection not found: " + con.id;
            }
            connection = await dbs.connections.update({ id: con.id }, (0, PubSubManager_1.omitKeys)(c, ["id"]), { returning: "*", multi: false });
        }
        else {
            await dbs.database_configs.insert((0, PubSubManager_1.pickKeys)({ ...c }, ["db_host", "db_name", "db_port"]), { fixIssues: true, returning: "*", onConflictDoNothing: true });
            connection = await dbs.connections.insert({ ...c, info: { canCreateDb } }, { returning: "*" });
        }
        if (!connection) {
            throw "Could not create connection";
        }
        const database_config = await dbs.database_configs.findOne({ $existsJoined: { connections: { id: connection?.id } } });
        if (!database_config) {
            throw "Could not create database_config";
        }
        return { connection, database_config };
    }
    catch (e) {
        console.error(e);
        if (e && e.code === "23502") {
            throw { err_msg: ` ${e.column} cannot be empty` };
        }
        throw e;
    }
};
exports.upsertConnection = upsertConnection;
//# sourceMappingURL=upsertConnection.js.map