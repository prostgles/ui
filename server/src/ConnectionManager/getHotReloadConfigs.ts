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
import type { CONNECTION_HOT_RELOAD_COLUMNS } from "./initConnectionManager";
import { parseTableConfig } from "./parseTableConfig";
import type { RequiredKeepUndefined } from "@common/utils";
import { modifyClientSchema } from "./modifyClientSchema";
import { getSchemaConfig } from "./connectionManagerUtils";
import { getValidConfigPath } from "./getValidConfigPath";
import type { ServerFunctionDefinitions } from "prostgles-server";

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

const mergeFunctions = (
  schemaFunctions: ServerFunctionDefinitions<void, SUser> | undefined,
  connectionFunctions: ServerFunctionDefinitions<void, SUser>,
): ServerFunctionDefinitions<void, SUser> => {
  if (!schemaFunctions) return connectionFunctions;
  return async (params) => ({
    ...(await schemaFunctions(params)),
    /** Connection-managed functions retain precedence on name collisions. */
    ...(await connectionFunctions(params)),
  });
};

export const getHotReloadConfigs = async ({
  dbs,
  _dbs,
  connection,
  databaseConfig,
  connectionManager,
  stateDatabaseConfig,
}: {
  connectionManager: ConnectionManager;
  connection: ConnectionHotReloadProperties;
  databaseConfig: DatabaseConfigs;
  stateDatabaseConfig: DatabaseConfigs;
  dbs: DBS;
  _dbs: DB;
}) => {
  const schemaConfig = getSchemaConfig(databaseConfig);
  const schemaConfigPath =
    process.env.NODE_ENV === "production" || !schemaConfig ?
      undefined
    : getValidConfigPath(databaseConfig);
  const configuredConnection = {
    ...connection,
    ...schemaConfig?.connection,
  };
  const configuredDatabaseConfig = {
    ...databaseConfig,
    ...schemaConfig?.databaseConfig,
  };
  const { socketPath, socketUrl } = getConnectionSocketPath(connection);
  const connectionServers = connectionManager.getConnectionHttpServer({
    connection,
    databaseConfig,
    socketPath,
  });
  const { app } = connectionServers;

  const restApi = getRestApiConfig(
    app,
    configuredConnection,
    configuredDatabaseConfig,
  );
  const { fileTable, tableConfig } = await parseTableConfig({
    type: "saved",
    dbs,
    con: configuredConnection,
    conMgr: connectionManager,
    app,
    databaseConfig: configuredDatabaseConfig,
  });
  const auth = await getConnectionAuth(app, dbs, _dbs, {
    type: "connection",
    stateDatabaseConfig,
    connectionDatabaseConfig: configuredDatabaseConfig,
    connection: configuredConnection,
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
  const { web_app_templated, web_app_directory, db_schema_filter } =
    configuredConnection;
  const tsGeneratedTypesDir =
    schemaConfigPath ?
      join(schemaConfigPath, "src")
    : web_app_templated && web_app_directory ?
      join(web_app_directory, "client", "src", "api")
    : undefined;

  const connectionFunctions = await getConnectionServerFunctions({
    databaseConfig,
    dbs,
    connection,
    connectionManager,
  });

  return {
    config: {
      io: connectionServers.ioConnection,
      restApi,
      fileTable,
      tableConfig,
      auth,
      schemaFilter: schemaConfig?.schemaFilter ??
        db_schema_filter ?? { public: 1 },
      tsGeneratedTypesDir,
      functions: mergeFunctions(schemaConfig?.functions, connectionFunctions),
      modifyClientSchema: (table, tableConfig, userData) =>
        modifyClientSchema({
          connection: configuredConnection,
          databaseConfig: configuredDatabaseConfig,
          table,
          tableConfig,
          userData,
        }),
    } satisfies HotReloadConfigOptions,
    connectionServers,
  };
};
