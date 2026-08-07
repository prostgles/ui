import { spawn } from "child_process";
import type { DBS } from "..";
import { connectionManager } from "..";
import { runConnectionQuery } from "../serverFunctions/getServerFunctions";
import { getSchemaConfig } from "./connectionManagerUtils";
import { getValidConfigPath } from "./getValidConfigPath";

/**
 * Build and attach a schema-config project. Only its location is persisted;
 * its runtime exports are loaded into the connection's primary Prostgles
 * instance when that connection starts.
 */
export const syncSchemaConfig = async ({
  dbs,
  connectionId,
  schemaPath,
  allowCurrentProject = false,
}: {
  dbs: DBS;
  connectionId: string;
  schemaPath: string;
  allowCurrentProject?: boolean;
}) => {
  const config_sync = {
    schemaPath: getValidConfigPath(
      { config_sync: { schemaPath } },
      { allowCurrentProject },
    )!,
    lastSynced: new Date().toISOString(),
  };

  await new Promise<void>((resolve, reject) => {
    const child = spawn("tsc", {
      cwd: config_sync.schemaPath,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code === 0) return resolve();
      reject(new Error(`tsc exited code=${code} signal=${signal}`));
    });
  });
  const schemaConfig = getSchemaConfig(
    { config_sync },
    { allowCurrentProject },
  );
  if (schemaConfig?.onInitSQL) {
    await runConnectionQuery(connectionId, schemaConfig.onInitSQL, undefined, {
      dbs,
    });
  }

  const databaseConfig = await dbs.database_configs.update(
    { $existsJoined: { connections: { id: connectionId } } },
    { config_sync },
    { returning: "*", multi: false },
  );
  if (!databaseConfig) {
    throw "Database config not found";
  }

  /**
   * Restart instead of updating a second Prostgles instance: config hooks,
   * migrations, functions, and table config now all share the live instance.
   */
  if (connectionManager.getActiveConnectionSilentFail(connectionId)) {
    if (!connectionManager.db) throw "Connection manager database is not ready";
    await connectionManager.startConnection(
      connectionId,
      dbs,
      connectionManager.db,
      undefined,
      true,
    );
  }
};
