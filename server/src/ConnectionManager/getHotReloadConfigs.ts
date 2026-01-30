import { getAuthSetupData } from "@src/authConfig/subscribeToAuthSetupChanges";
import type { DB } from "prostgles-server/dist/Prostgles";
import type { UpdateableOptions } from "prostgles-server/dist/initProstgles";
import type { SUser } from "../authConfig/sessionUtils";
import type { Connections, DBS, DatabaseConfigs } from "../index";
import { getRestApiConfig, parseTableConfig } from "./connectionManagerUtils";
import { getConnectionAuth } from "./getConnectionAuth";
import { getConnectionSocketPath } from "./getConnectionSocketPath";
import type { ConnectionManager } from "./ConnectionManager";
import { join } from "path";

export type HotReloadConfigOptions = Pick<
  UpdateableOptions<void, SUser>,
  | "fileTable"
  | "restApi"
  | "schemaFilter"
  | "auth"
  | "io"
  | "tsGeneratedTypesDir"
>;
export const getHotReloadConfigs = async ({
  dbs,
  _dbs,
  connection,
  databaseConfig,
  connectionManager,
  stateDatabaseConfig,
}: {
  connectionManager: ConnectionManager;
  connection: Connections;
  databaseConfig: DatabaseConfigs;
  stateDatabaseConfig: DatabaseConfigs;
  dbs: DBS;
  _dbs: DB;
}) => {
  const { socketPath, socketUrl } = getConnectionSocketPath(connection);
  const connectionServers = connectionManager.getConnectionHttpServer({
    connection,
    databaseConfig,
    socketPath,
  });
  const { app } = connectionServers;

  const restApi = getRestApiConfig(app, connection, databaseConfig);
  const { fileTable } = await parseTableConfig({
    type: "saved",
    dbs,
    con: connection,
    conMgr: connectionManager,
    app,
  });
  const auth = await getConnectionAuth(app, dbs, _dbs, {
    type: "connection",
    stateDatabaseConfig,
    connectionDatabaseConfig: databaseConfig,
    connection,
    passwordlessAdmin: getAuthSetupData().passwordlessAdmin,
  });
  const activeConnection = connectionManager.getActiveConnectionSilentFail(
    connection.id,
  );

  if (activeConnection) {
    activeConnection.app = app;
    activeConnection.io = connectionServers.ioConnection;
    activeConnection.socketPath = socketPath;
    activeConnection.socketUrl = socketUrl;
  }
  const { web_app_templated, web_app_directory } = connection;
  const tsGeneratedTypesDir =
    web_app_templated && web_app_directory ?
      join(web_app_directory, "client", "src", "api")
    : undefined;
  return {
    config: {
      io: connectionServers.ioConnection,
      restApi,
      fileTable,
      auth,
      schemaFilter: connection.db_schema_filter ?? { public: 1 },
      tsGeneratedTypesDir,
    } satisfies HotReloadConfigOptions,
    connectionServers,
  };
};
