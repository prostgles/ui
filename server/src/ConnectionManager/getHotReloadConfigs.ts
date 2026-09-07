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
import type { ServerFunctionDefinitions, SessionUser } from "prostgles-server";
import { getSchemaConfig } from "./getSchemaConfig";
import { IS_PROD } from "@src/init/utils";
import { generatedFolderName, srcFolderName } from "@src/cli/cliTemplateFiles";
import type { ProstglesContext } from "@src/schemaConfig";

export type HotReloadConfigOptions = RequiredKeepUndefined<
  Pick<
    UpdatableOptions<void, SUser, ProstglesContext>,
    | "fileTable"
    | "restApi"
    | "schemaFilter"
    | "auth"
    | "io"
    | "audit"
    | "tableConfig"
    | "tableHooks"
    | "functions"
    | "tsGeneratedTypesDir"
    | "tsGeneratedTypesFunctionsPath"
    | "modifyClientSchema"
  >
>;

export type ConnectionHotReloadProperties = Pick<
  Connections,
  (typeof CONNECTION_HOT_RELOAD_COLUMNS)[number]
>;

const mergeFunctions = (
  schemaFunctions:
    | ServerFunctionDefinitions<void, SessionUser, ProstglesContext | undefined>
    | undefined,
  connectionFunctions: ServerFunctionDefinitions<void, SUser, ProstglesContext>,
): ServerFunctionDefinitions<void, SUser, ProstglesContext> => {
  if (!schemaFunctions) return connectionFunctions;
  return {
    ...schemaFunctions,
    /** Connection-managed functions retain precedence on name collisions. */
    ...connectionFunctions,
  } as ServerFunctionDefinitions<void, SUser, ProstglesContext>;
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
  const loadedSchemaConfig = getSchemaConfig(databaseConfig.config_sync);
  const schemaConfig = loadedSchemaConfig?.config;
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
    connection: configuredConnection,
    databaseConfig: configuredDatabaseConfig,
    socketPath,
  });
  const { app } = connectionServers;

  const restApi = getRestApiConfig(
    app,
    configuredConnection,
    configuredDatabaseConfig,
  );
  const { fileTable, tableConfig, tableHooks } = await parseTableConfig({
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

  const { config_sync } = configuredDatabaseConfig;
  const {
    web_app_templated,
    web_app_directory,
    db_schema_filter,
    db_watch_schema,
  } = configuredConnection;

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
      tableHooks,
      audit: schemaConfig?.audit,
      auth,
      schemaFilter: db_schema_filter ?? { public: 1 },
      tsGeneratedTypesDir:
        IS_PROD ? undefined
        : web_app_templated && web_app_directory ?
          join(web_app_directory, "client", "src", "api")
        : db_watch_schema && config_sync?.type === "cli" ?
          join(config_sync.configPath, generatedFolderName)
        : undefined,
      tsGeneratedTypesFunctionsPath:
        !IS_PROD && db_watch_schema && config_sync?.type === "cli" ?
          join(config_sync.configPath, srcFolderName, "index.ts")
        : undefined,
      functions: mergeFunctions(schemaConfig?.functions, connectionFunctions),
      modifyClientSchema: (table, tableConfig, userData) =>
        modifyClientSchema({
          connection: configuredConnection,
          databaseConfig: configuredDatabaseConfig,
          table,
          tableConfig,
          userData,
          audit: schemaConfig?.audit,
        }),
    } satisfies HotReloadConfigOptions,
    connectionServers,
    schemaConfig,
  };
};
