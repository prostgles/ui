import { USER_TYPES } from "@common/authTypesAndConstants";
import type { DBSchema } from "@common/DBGeneratedSchema";
import { setTimeout as delay } from "node:timers/promises";
import type { SchemaConfig } from "../schemaConfig";
import type { TestDeploymentSeedContext } from "./createTestDeployment";

export const waitForTestUserSync = async ({
  stateDatabase,
  projectDatabase,
  projectDatabaseName,
  timeoutMs,
}: TestDeploymentSeedContext & {
  projectDatabaseName: string;
  timeoutMs: number;
}) => {
  const { rows: databaseConfigs } = await stateDatabase.query<
    Pick<DBSchema["database_configs"], "config_sync" | "sync_users">
  >("SELECT config_sync, sync_users FROM database_configs WHERE db_name = $1", [
    projectDatabaseName,
  ]);
  const [databaseConfig] = databaseConfigs;
  if (!databaseConfig)
    throw new Error("Test database configuration is missing.");
  const configExports =
    databaseConfig.config_sync ?
      (require(databaseConfig.config_sync.configPath) as
        SchemaConfig | { default: SchemaConfig })
    : undefined;
  const config =
    configExports && "default" in configExports ?
      configExports.default
    : configExports;
  const syncEnabled =
    config?.databaseConfig?.sync_users ?? databaseConfig.sync_users;
  if (!syncEnabled) return;

  const { rows: expectedUsers } = await stateDatabase.query<{ id: string }>(
    `SELECT u.id FROM users u
     WHERE u.type = ANY($2::text[]) OR EXISTS (
       SELECT 1 FROM access_control_user_types acut
       JOIN access_control_connections acc ON acc.access_control_id = acut.access_control_id
       JOIN connections c ON c.id = acc.connection_id
       WHERE acut.user_type = u.type AND c.db_name = $1
     )`,
    [projectDatabaseName, [USER_TYPES.ADMIN, USER_TYPES.CONNECTION_ADMIN]],
  );
  const expectedUserIds = expectedUsers.map(({ id }) => id);
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const { rows: syncedUsers } = await projectDatabase.query<{ id: string }>(
      "SELECT id FROM users WHERE id = ANY($1::uuid[])",
      [expectedUserIds],
    );
    if (syncedUsers.length === expectedUserIds.length) return;
    await delay(50);
  }
  throw new Error("Timed out waiting for test users to sync before seeding.");
};
