import { getAuthSetupData } from "@src/authConfig/subscribeToAuthSetupChanges";
import type { DB } from "prostgles-server/dist/Prostgles";
import type { UpdatableOptions } from "prostgles-server/dist/initProstgles";
import type { SUser } from "../authConfig/sessionUtils";
import type { Connections, DBS, DatabaseConfigs } from "../index";
import { getRestApiConfig } from "./connectionManagerUtils";
import { getConnectionAuth } from "./getConnectionAuth";
import { getConnectionSocketPath } from "./getConnectionSocketPath";
import type { ConnectionManager } from "./ConnectionManager";
import { join } from "path";
import { getConnectionServerFunctions } from "./getConnectionServerFunctions";
import type { ConnectionDetails } from "@src/connectionUtils/getConnectionDetails";
import type { CONNECTION_HOT_RELOAD_COLUMNS } from "./initConnectionManager";
import { parseTableConfig } from "./parseTableConfig";
import type { RequiredKeepUndefined } from "@common/utils";
import { modifyClientSchema } from "./modifyClientSchema";

export type HotReloadConfigOptions = RequiredKeepUndefined<
  Pick<
    UpdatableOptions<void, SUser>,
    | "fileTable"
    | "restApi"
    | "schemaFilter"
    | "auth"
    | "io"
    | "tableConfig"
    | "functions"
    | "tsGeneratedTypesDir"
    | "modifyClientSchema"
  >
>;

export type ConnectionHotReloadProperties = Pick<
  Connections,
  (typeof CONNECTION_HOT_RELOAD_COLUMNS)[number]
>;

export const getHotReloadConfigs = async ({
  dbs,
  _dbs,
  connection,
  databaseConfig,
  connectionManager,
  stateDatabaseConfig,
  connectionInfo,
}: {
  connectionManager: ConnectionManager;
  connection: ConnectionHotReloadProperties;
  databaseConfig: DatabaseConfigs;
  stateDatabaseConfig: DatabaseConfigs;
  dbs: DBS;
  _dbs: DB;
  connectionInfo: ConnectionDetails;
}) => {
  const { socketPath, socketUrl } = getConnectionSocketPath(connection);
  const connectionServers = connectionManager.getConnectionHttpServer({
    connection,
    databaseConfig,
    socketPath,
  });
  const { app } = connectionServers;

  const restApi = getRestApiConfig(app, connection, databaseConfig);
  const { fileTable, tableConfig } = await parseTableConfig({
    type: "saved",
    dbs,
    con: connection,
    conMgr: connectionManager,
    app,
    databaseConfig,
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
  const { web_app_templated, web_app_directory, db_schema_filter } = connection;
  const tsGeneratedTypesDir =
    web_app_templated && web_app_directory ?
      join(web_app_directory, "client", "src", "api")
    : undefined;

  const functions = await getConnectionServerFunctions({
    databaseConfig,
    dbs,
    connection,
    connectionManager,
    connectionInfo,
  });

  return {
    config: {
      io: connectionServers.ioConnection,
      restApi,
      fileTable,
      tableConfig,
      auth,
      schemaFilter: db_schema_filter ?? { public: 1 },
      tsGeneratedTypesDir,
      functions,
      modifyClientSchema: (table, userData) =>
        modifyClientSchema({ connection, databaseConfig, table, userData }),
    } satisfies HotReloadConfigOptions,
    connectionServers,
  };
};
