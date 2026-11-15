import { ConnectionString } from "connection-string";

export const getCliDatabaseConfig = (environment: NodeJS.ProcessEnv) => {
  const serverUrl = getRequiredVariable(environment, "PROSTGLES_PG_SERVER_URL");
  const stateName = getRequiredVariable(environment, "PROSTGLES_STATE_DB_NAME");
  const appName = getRequiredVariable(environment, "PROSTGLES_APP_DB_NAME");
  if (stateName === appName) {
    throw new Error("The state and app database names must be different.");
  }
  return {
    serverUrl: getMaintenanceDatabaseUrl(serverUrl),
    state: { name: stateName, url: getDatabaseUrl(serverUrl, stateName) },
    project: { name: appName, url: getDatabaseUrl(serverUrl, appName) },
  };
};

export const getDatabaseUrl = (serverUrl: string, databaseName: string) => {
  if (
    !databaseName ||
    databaseName.includes("\0") ||
    Buffer.byteLength(databaseName) > 63
  ) {
    throw new Error(
      "Database names must contain between 1 and 63 bytes and no null characters.",
    );
  }
  const connection = new ConnectionString(serverUrl);
  connection.path = [databaseName];
  if (connection.params) {
    delete connection.params.dbname;
    delete connection.params.database;
  }
  return connection.toString();
};

const getMaintenanceDatabaseUrl = (serverUrl: string) => {
  const connection = new ConnectionString(serverUrl);
  if (!connection.path?.join("/") && !connection.params?.dbname) {
    connection.path = ["postgres"];
  }
  return connection.toString();
};

const getRequiredVariable = (environment: NodeJS.ProcessEnv, name: string) => {
  const value = environment[name];
  if (!value?.trim()) throw new Error(`${name} is required.`);
  return value;
};
