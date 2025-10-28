import { omitKeys, pickKeys, type ProstglesError } from "prostgles-types";
import type { Connections, DBS, Users } from ".";
import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { testDBConnection } from "./connectionUtils/testDBConnection";
import { validateConnection } from "./connectionUtils/validateConnection";
import { applySampleSchema } from "./publishMethods/applySampleSchema";

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
      await dbs.database_configs.insert(
        pickKeys({ ...c }, ["db_host", "db_name", "db_port"]),
        {
          removeDisallowedFields: true,
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
      await applySampleSchema(dbs, sampleSchemaName, connection.id);
    }
    const database_config = await dbs.database_configs.findOne({
      $existsJoined: { connections: { id: connection.id } },
    });
    if (!database_config) {
      throw "Could not create database_config";
    }
    return { connection, database_config };
  } catch (_e: any) {
    const e = _e as ProstglesError | undefined;
    console.error(e);
    if (e && e.code === "23502") {
      throw { err_msg: ` ${e.column} cannot be empty` };
    }
    throw e;
  }
};
