import type { DBS } from "..";
import { connectionManager } from "..";
import type { ConnectionInsert } from "../connectionUtils/validateConnection";
import { upsertConnection } from "../upsertConnection";
import { getSchemaConfig } from "./getSchemaConfig";
import { syncSchemaConfig } from "./syncSchemaConfig";
import type { DB } from "prostgles-server/dist/Prostgles";

export const getStartupSchemaConfig = () => {
  const configPath = process.env.PROSTGLES_UI_CONFIG;
  if (!configPath) return;

  const loadedSchemaConfig = getSchemaConfig({
    configPath,
    type: "cli",
    lastSynced: new Date().toISOString(),
  });
  const schemaConfig = loadedSchemaConfig.config;
  if (!schemaConfig.id) {
    throw new Error(
      "The config must export an `id` when started through the CLI.",
    );
  }
  const databaseUrl = process.env.PROSTGLES_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "PROSTGLES_DATABASE_URL is required when started through the CLI.",
    );
  }

  return {
    configPath: loadedSchemaConfig.configPath,
    databaseUrl,
    schemaConfig,
  };
};

/** Apply the config selected by the CLI after the state database is ready. */
export const applyStartupSchemaConfig = async ({
  dbs,
  db,
  startupSchemaConfig,
}: {
  dbs: DBS;
  db: DB;
  startupSchemaConfig: ReturnType<typeof getStartupSchemaConfig>;
}) => {
  if (!startupSchemaConfig) return;
  const { configPath, databaseUrl, schemaConfig } = startupSchemaConfig;
  const configuredConnection = {
    ...schemaConfig.connection,
    type: "Connection URI" as const,
    db_conn: databaseUrl,
  };

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
    configPath,
    type: "cli",
  });
  await connectionManager.startConnection(connection.id, dbs, db);
};
