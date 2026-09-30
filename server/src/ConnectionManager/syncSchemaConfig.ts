import type { DatabaseConfigs, DBS } from "..";
import { connectionManager } from "..";
import { runConnectionQuery } from "../serverFunctions/stateServerFunctions";
import { compileSchemaConfigProject } from "./compileSchemaConfigProject";
import { getSchemaConfig } from "./getSchemaConfig";
import { getEntries } from "@common/utils";
import { includes } from "prostgles-types";
import { syncSchemaConfigResources } from "./syncSchemaConfigResources";
import { startConnection } from "./startConnection";

/**
 * Build and attach a schema-config project. Only its location is persisted;
 * its runtime exports are loaded into the connection's primary Prostgles
 * instance when that connection starts.
 */
export const syncSchemaConfig = async ({
  dbs,
  connectionId,
  configPath,
  type,
}: {
  dbs: DBS;
  connectionId: string;
  configPath: string;
  type: "sample-schema" | "cli";
}) => {
  await compileSchemaConfigProject(configPath);
  const config_sync: NonNullable<DatabaseConfigs["config_sync"]> = {
    type,
    configPath,
    lastSynced: new Date().toISOString(),
    toggleableProperties: {},
  };
  const loadedSchemaConfig = getSchemaConfig(config_sync);
  const { config: schemaConfig, configPath: resolvedConfigPath } =
    loadedSchemaConfig;
  getEntries(schemaConfig).forEach(([key, value]) => {
    if (
      value !== undefined &&
      includes(["tableConfig", "functions", "onMount"] as const, key)
    ) {
      config_sync.toggleableProperties[key] = 1;
    }
  });
  return connectionManager.runConnectionOperation(connectionId, async () => {
    if (schemaConfig.onInitSQL) {
      await runConnectionQuery(connectionId, schemaConfig.onInitSQL, undefined, {
        dbs,
      });
    }

    const databaseConfig = await dbs.database_configs.update(
      { $existsJoined: { connections: { id: connectionId } } },
      { config_sync: { ...config_sync, configPath: resolvedConfigPath } },
      { returning: "*", multi: false },
    );
    if (!databaseConfig) {
      throw "Database config not found";
    }

    // Apply the schema once, before configured workspaces need its tables.
    if (
      connectionManager.getActiveConnectionSilentFail(connectionId) ||
      schemaConfig.workspaces?.length
    ) {
      if (!connectionManager.db) throw "Connection manager database is not ready";
      // Already holding the connection lifecycle queue.
      await startConnection.call(
        connectionManager,
        connectionId,
        dbs,
        connectionManager.db,
        undefined,
        true,
      );
    }

    await syncSchemaConfigResources({
      dbs,
      databaseId: databaseConfig.id,
      connectionId,
      rules: schemaConfig.accessControl,
      workspaces: schemaConfig.workspaces,
      llmCredential: schemaConfig.llmCredential,
    });

    const activeConnection =
      connectionManager.getActiveConnectionSilentFail(connectionId);
    if (activeConnection) {
      // Still holding the queue: publish the synced rules before returning.
      await connectionManager.updateConnectionAccess(activeConnection);
    }
  });
};
