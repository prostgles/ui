import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Client, escapeIdentifier } from "pg";
import { getCliDatabaseConfig } from "../cli/getCliDatabaseConfig";
import { startTemporaryDatabases } from "../cli/startTemporaryDatabases";

export const startTestDatabases = async (
  options: Parameters<typeof startTemporaryDatabases>[0],
  environment: NodeJS.ProcessEnv,
) => {
  const serverUrl = environment.PROSTGLES_E2E_PG_SERVER_URL?.trim();
  const prefix = environment.PROSTGLES_E2E_DB_NAMES_PREFIX?.trim();
  if (!serverUrl && !prefix) {
    return startTemporaryDatabases({
      ...options,
      postgresImage:
        options.postgresImage ?? environment.PROSTGLES_TEST_POSTGRES_IMAGE,
    });
  }
  if (!serverUrl || !prefix) {
    throw new Error(
      "Set both PROSTGLES_E2E_PG_SERVER_URL and PROSTGLES_E2E_DB_NAMES_PREFIX, or neither to use temporary Docker databases.",
    );
  }
  const databases = getCliDatabaseConfig({
    PROSTGLES_PG_SERVER_URL: serverUrl,
    PROSTGLES_STATE_DB_NAME: `${prefix}_state_db`,
    PROSTGLES_APP_DB_NAME: `${prefix}_app_db`,
  });
  const maintenance = new Client({ connectionString: databases.serverUrl });
  try {
    await maintenance.connect();
    const {
      rows: [lock],
    } = await maintenance.query<{ acquired: boolean }>(
      "SELECT pg_try_advisory_lock(hashtext($1)) AS acquired",
      [`prostgles-e2e:${prefix}`],
    );
    if (!lock?.acquired) {
      throw new Error(
        `Test databases for ${prefix} are already in use. Run tests serially or use another PROSTGLES_E2E_DB_NAMES_PREFIX.`,
      );
    }
    const {
      rows: [current],
    } = await maintenance.query<{ name: string }>(
      "SELECT current_database() AS name",
    );
    if (
      [databases.state.name, databases.project.name].includes(current!.name)
    ) {
      throw new Error(
        "PROSTGLES_E2E_PG_SERVER_URL must use a maintenance database, not either test database.",
      );
    }
    await mkdir(path.dirname(options.logPath), { recursive: true });
    await writeFile(
      options.logPath,
      `Recreating ${databases.state.name} and ${databases.project.name}. Databases are retained after tests; PostgreSQL server logs remain on the configured server.\n`,
    );
    for (const { name } of [databases.state, databases.project]) {
      const identifier = escapeIdentifier(name);
      await maintenance.query(
        `DROP DATABASE IF EXISTS ${identifier} WITH (FORCE)`,
      );
      await maintenance.query(`CREATE DATABASE ${identifier}`);
    }
    return {
      state: databases.state,
      project: databases.project,
      dispose: () => maintenance.end(),
    };
  } catch (error) {
    await maintenance.end();
    throw error;
  }
};
