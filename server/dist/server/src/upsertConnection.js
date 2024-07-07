"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertConnection = void 0;
const PubSubManager_1 = require("prostgles-server/dist/PubSubManager/PubSubManager");
const testDBConnection_1 = require("./connectionUtils/testDBConnection");
const validateConnection_1 = require("./connectionUtils/validateConnection");
const publishMethods_1 = require("./publishMethods/publishMethods");
const loadSampleSchema = async (dbs, sampleSchemaName, connId) => {
    const schema = (await (0, publishMethods_1.getSampleSchemas)()).find(s => s.name === sampleSchemaName);
    if (!schema) {
        throw "Sample schema not found: " + sampleSchemaName;
    }
    if (schema.type === "sql") {
        await (0, publishMethods_1.runConnectionQuery)(connId, schema.file);
    }
    else {
        const { tableConfigTs, onMountTs, onInitSQL } = schema;
        if (onInitSQL) {
            await (0, publishMethods_1.runConnectionQuery)(connId, onInitSQL);
        }
        await dbs.database_configs.update({ $existsJoined: { connections: { id: connId } } }, {
            table_config_ts: tableConfigTs,
            on_mount_ts: onMountTs,
        });
    }
};
const upsertConnection = async (con, user_id, dbs, sampleSchemaName) => {
    const c = (0, validateConnection_1.validateConnection)({
        ...con,
        name: con.name || con.db_name,
        user_id,
        last_updated: Date.now().toString()
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
            const dbConf = await dbs.database_configs.insert((0, PubSubManager_1.pickKeys)({ ...c }, ["db_host", "db_name", "db_port"]), { fixIssues: true, returning: "*", onConflict: "DoNothing" });
            connection = await dbs.connections.insert({ ...c, info: { canCreateDb } }, { returning: "*" });
        }
        if (!connection) {
            throw "Could not create connection";
        }
        if (sampleSchemaName) {
            await loadSampleSchema(dbs, sampleSchemaName, connection.id);
        }
        const database_config = await dbs.database_configs.findOne({ $existsJoined: { connections: { id: connection.id } } });
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