import type { DBS } from "..";
import { connectionManager } from "..";
import { testDBConnection } from "../connectionUtils/testDBConnection";
import { validateConnection } from "../connectionUtils/validateConnection";
import type { ConnectionInsert } from "../connectionUtils/validateConnection";
import type { SchemaConfigConnection } from "../schemaConfig";
import { upsertConnection } from "../upsertConnection";
import { getSchemaConfig } from "./getSchemaConfig";
import { syncSchemaConfig } from "./syncSchemaConfig";
import type { DB } from "prostgles-server/dist/Prostgles";

const createDatabaseIfMissing = async (
  configuredConnection: SchemaConfigConnection,
) => {
  const connection = validateConnection(configuredConnection);
  await testDBConnection(
    {
      ...connection,
      type: "Standard",
      db_conn: undefined,
      db_name: "postgres",
    },
    false,
    async (client) => {
      const database = await client.oneOrNone<{ datname: string }>(
        "SELECT datname FROM pg_catalog.pg_database WHERE datname = $1",
        [connection.db_name],
      );
      if (!database) {
        await client.none(`CREATE DATABASE \${db_name:name}`, {
          db_name: connection.db_name,
        });
      }
    },
  );
};

/** Apply the config selected by the CLI after the state database is ready. */
export const applyStartupSchemaConfig = async ({
  dbs,
  db,
}: {
  dbs: DBS;
  db: DB;
}) => {
  const configPath = process.env.PROSTGLES_UI_CONFIG;
  if (!configPath) return;

  const config_sync = {
    configPath,
    type: "cli",
    lastSynced: new Date().toISOString(),
  } as const;
  const loadedSchemaConfig = getSchemaConfig(config_sync);
  const schemaConfig = loadedSchemaConfig.config;
  if (!schemaConfig.id) {
    throw new Error(
      "The config must export an `id` when started through the CLI.",
    );
  }
  const configuredConnection = schemaConfig.connection;
  if (
    !configuredConnection?.type ||
    !(configuredConnection.db_conn || configuredConnection.db_host)
  ) {
    throw new Error(
      "The config must provide connection.type and connection.db_conn or connection.db_host.",
    );
  }
  if (schemaConfig.createDatabase) {
    await createDatabaseIfMissing(configuredConnection);
  }

  const existingConnection = await dbs.connections.findOne({
    name: schemaConfig.id,
  });
  const { connection } = await upsertConnection(
    {
      ...configuredConnection,
      id: existingConnection?.id,
      name: schemaConfig.id,
    } as ConnectionInsert,
    null,
    dbs,
    ["*"],
  );

  await syncSchemaConfig({
    dbs,
    connectionId: connection.id,
    configPath: loadedSchemaConfig.configPath,
    type: "cli",
  });
  await connectionManager.startConnection(connection.id, dbs, db);
};
