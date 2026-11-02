import { testDBConnection } from "../connectionUtils/testDBConnection";
import { validateConnection } from "../connectionUtils/validateConnection";
import { getCliDatabaseConfig } from "./getCliDatabaseConfig";

export const ensureCliDatabases = async (environment: NodeJS.ProcessEnv) => {
  const { serverUrl, state, project } = getCliDatabaseConfig(environment);
  const connection = validateConnection({
    type: "Connection URI" as const,
    db_conn: serverUrl,
  });
  await testDBConnection(connection, false, async (client) => {
    for (const { name } of [state, project]) {
      const database = await client.oneOrNone<{ datname: string }>(
        "SELECT datname FROM pg_catalog.pg_database WHERE datname = $1",
        [name],
      );
      if (!database) {
        await client.none("CREATE DATABASE ${name:name}", { name });
      }
    }
  });
};
