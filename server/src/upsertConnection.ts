import {
  omitKeys,
  pickKeys,
} from "prostgles-server/dist/PubSubManager/PubSubManager";
import type { Connections, DBS, Users } from ".";
import type { DBGeneratedSchema } from "../../commonTypes/DBGeneratedSchema";
import { testDBConnection } from "./connectionUtils/testDBConnection";
import { validateConnection } from "./connectionUtils/validateConnection";
import {
  getSampleSchemas,
  runConnectionQuery,
} from "./publishMethods/publishMethods";

const loadSampleSchema = async (
  dbs: DBS,
  sampleSchemaName: string,
  connId: string,
) => {
  const schema = (await getSampleSchemas()).find(
    (s) => s.name === sampleSchemaName,
  );
  if (!schema) {
    throw "Sample schema not found: " + sampleSchemaName;
  }
  if (schema.type === "sql") {
    await runConnectionQuery(connId, schema.file, undefined, { dbs });
  } else {
    const { tableConfigTs, onMountTs, onInitSQL } = schema;
    if (onInitSQL) {
      await runConnectionQuery(connId, onInitSQL, undefined, { dbs });
    }
    await dbs.database_configs.update(
      { $existsJoined: { connections: { id: connId } } },
      { table_config_ts: tableConfigTs },
    );
    await dbs.connections.update({ id: connId }, { on_mount_ts: onMountTs });
  }
};

export const upsertConnection = async (
  con: DBGeneratedSchema["connections"]["columns"],
  user_id: Users["id"] | null,
  dbs: DBS,
  sampleSchemaName?: string,
) => {
  const c = validateConnection({
    ...con,
    name: con.name || con.db_name,
    user_id,
    last_updated: Date.now().toString(),
  });
  const { canCreateDb } = await testDBConnection(con);
  try {
    let connection: Connections | undefined;
    if (con.id) {
      if (!(await dbs.connections.findOne({ id: con.id }))) {
        throw "Connection not found: " + con.id;
      }
      connection = await dbs.connections.update(
        { id: con.id },
        omitKeys(c as any, ["id"]),
        { returning: "*", multi: false },
      );
    } else {
      const dbConf = await dbs.database_configs.insert(
        pickKeys({ ...c }, ["db_host", "db_name", "db_port"]) as any,
        {
          removeDisallowedFields: true,
          returning: "*",
          onConflict: "DoNothing",
        },
      );
      connection = await dbs.connections.insert(
        { ...c, info: { canCreateDb } },
        { returning: "*" },
      );
    }

    if (!connection) {
      throw "Could not create connection";
    }
    if (sampleSchemaName) {
      await loadSampleSchema(dbs, sampleSchemaName, connection.id);
    }
    const database_config = await dbs.database_configs.findOne({
      $existsJoined: { connections: { id: connection.id } },
    });
    if (!database_config) {
      throw "Could not create database_config";
    }
    return { connection, database_config };
  } catch (e: any) {
    console.error(e);
    if (e && e.code === "23502") {
      throw { err_msg: ` ${e.column} cannot be empty` };
    }
    throw e;
  }
};
