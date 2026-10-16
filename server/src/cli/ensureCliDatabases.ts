import { ConnectionString } from "connection-string";
import { testDBConnection } from "../connectionUtils/testDBConnection";
import { validateConnection } from "../connectionUtils/validateConnection";

type CliDatabaseUrls = {
  PROSTGLES_STATE_DATABASE_URL: string;
  PROSTGLES_DATABASE_URL: string;
};

const getConnection = (url: string, variableName: keyof CliDatabaseUrls) => {
  const parsed = new ConnectionString(url);
  const databaseName = parsed.path?.join("/");
  if (!databaseName) {
    throw new Error(`${variableName} must include a database name.`);
  }

  return validateConnection({
    type: "Connection URI" as const,
    db_conn: url,
  });
};

const createDatabaseIfMissing = async (
  connection: ReturnType<typeof getConnection>,
) => {
  const maintenanceUrl = new ConnectionString(connection.db_conn);
  maintenanceUrl.path = ["postgres"];
  await testDBConnection(
    {
      ...connection,
      db_conn: maintenanceUrl.toString(),
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

export const ensureCliDatabases = async (environment: CliDatabaseUrls) => {
  const stateConnection = getConnection(
    environment.PROSTGLES_STATE_DATABASE_URL,
    "PROSTGLES_STATE_DATABASE_URL",
  );
  const targetConnection = getConnection(
    environment.PROSTGLES_DATABASE_URL,
    "PROSTGLES_DATABASE_URL",
  );

  if (
    stateConnection.db_host !== targetConnection.db_host ||
    stateConnection.db_port !== targetConnection.db_port
  ) {
    throw new Error(
      "PROSTGLES_STATE_DATABASE_URL and PROSTGLES_DATABASE_URL must use the same PostgreSQL server.",
    );
  }
  if (stateConnection.db_name === targetConnection.db_name) {
    throw new Error("The state and target database names must be different.");
  }

  await createDatabaseIfMissing(stateConnection);
  await createDatabaseIfMissing(targetConnection);
};
