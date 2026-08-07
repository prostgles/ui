import type { DBS } from "..";
import { connectionManager } from "..";
import type { ConnectionInsert } from "../connectionUtils/validateConnection";
import { upsertConnection } from "../upsertConnection";
import { getSchemaConfig } from "./connectionManagerUtils";
import { getValidConfigPath } from "./getValidConfigPath";
import { syncSchemaConfig } from "./syncSchemaConfig";
import type { DB } from "prostgles-server/dist/Prostgles";

/** Apply the config selected by the CLI after the state database is ready. */
export const applyStartupSchemaConfig = async ({
  dbs,
  db,
}: {
  dbs: DBS;
  db: DB;
}) => {
  const schemaPath = process.env.PROSTGLES_UI_CONFIG;
  if (!schemaPath) return;

  const config_sync = { schemaPath };
  const resolvedPath = getValidConfigPath({ config_sync })!;
  const schemaConfig = getSchemaConfig({ config_sync });
  if (!schemaConfig?.id) {
    throw new Error("The config must export an `id` when started through the CLI.");
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
    schemaPath: resolvedPath,
  });
  await connectionManager.startConnection(connection.id, dbs, db);
};
