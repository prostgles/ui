import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { DBSSchema } from "@common/publishUtils";
import prostgles from "prostgles-server";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder/DBSchemaBuilder";
import type { PRGLIOSocket } from "prostgles-server/dist/DboBuilder/DboBuilder";
import { getErrorAsObject } from "prostgles-server/dist/DboBuilder/dboBuilderUtils";
import { getIsSuperUser, type DB } from "prostgles-server/dist/Prostgles";
import {
  getSerialisableError,
  pickKeys,
  type AnyObject,
} from "prostgles-types";
import { addLog } from "../Logger";
import type { SUser } from "../authConfig/sessionUtils";
import { testDBConnection } from "../connectionUtils/testDBConnection";
import { log, restartProc } from "../index";
import type { ConnectionManager, User } from "./ConnectionManager";
import { getHotReloadConfigs } from "./getHotReloadConfigs";
import { ForkedPrglProcRunner } from "./ForkedPrglProcRunner/ForkedPrglProcRunner";
import { getConnectionOnReady } from "./connectionOnReady";
import { getConnectionPublish } from "./getConnectionPublish";
import { getConnectionServerFunctions } from "./getConnectionServerFunctions";
import { getConnectionSocketPath } from "./getConnectionSocketPath";

export const startConnection = async function (
  this: ConnectionManager,
  connectionId: string,
  dbs: DBOFullyTyped<DBGeneratedSchema>,
  _dbs: DB,
  socket?: PRGLIOSocket,
  restartIfExists = false,
): Promise<{ socketPath: string; socketUrl: string | undefined } | undefined> {
  let existingConnection = this.prglConnections.get(connectionId);
  if (existingConnection) {
    if (existingConnection.state === "initializing") {
      existingConnection = await existingConnection.initPromise;
    }
    if (restartIfExists) {
      if (existingConnection.state === "started") {
        await existingConnection.prgl.destroy();
      }
      this.prglConnections.delete(connectionId);
    } else if (existingConnection.state === "error") {
      throw existingConnection.error;
    } else {
      return pickKeys(existingConnection, ["socketPath", "socketUrl"]);
    }
  }

  const connection = await dbs.connections
    .findOne({ id: connectionId })
    .catch((e) => {
      console.error("Could not fetch connection", e);
      return undefined;
    });

  if (!connection) throw "Connection not found";
  const databaseConfig = await dbs.database_configs.findOne({
    $existsJoined: { connections: { id: connection.id } },
  });
  if (!databaseConfig) throw "databaseConfig not found";
  const stateDatabaseConfig = await dbs.database_configs.findOne({
    $existsJoined: { connections: { is_state_db: true } },
  });
  if (!stateDatabaseConfig) throw "State database config not found";

  const { connectionInfo, isSSLModeFallBack } =
    await testDBConnection(connection);
  log(
    "testDBConnection ok" +
      (isSSLModeFallBack ? ". (sslmode=prefer fallback)" : ""),
  );

  const creatingPref = "connecting to " + connection.db_name;
  const existingInstance = this.prglConnections.get(connection.id);
  const prglInstance =
    existingInstance?.state === "initializing" ?
      await existingInstance.initPromise
    : existingInstance;

  const { socketPath, socketUrl } = getConnectionSocketPath(connection);
  if (prglInstance) {
    if (
      prglInstance.socketPath !== socketPath ||
      prglInstance.socketUrl !== socketUrl
    ) {
      console.error("socket_path changed");
      restartProc(() => {
        socket?.emit("server-restart-request");
      });

      if (prglInstance.state === "started") {
        log("disconnecting from ", Object.keys(prglInstance.con.db_name));
        await prglInstance.prgl.destroy();
      }
    } else {
      if (prglInstance.state === "error") {
        throw prglInstance.error;
      }
      log("reusing ", Object.keys(prglInstance));
      return { socketPath, socketUrl };
    }
  }
  log(creatingPref);

  const result = new Promise<{
    socketPath: string;
    socketUrl: string | undefined;
  }>(
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    async (resolve, reject) => {
      const initState = {
        prglReady: false,
        onReadyCalled: false,
      };
      const setInitState = (newState: Partial<typeof initState>) => {
        Object.assign(initState, newState);
        if (initState.prglReady && initState.onReadyCalled) {
          resolve({ socketPath, socketUrl });
        }
      };

      try {
        const {
          config: hotReloadConfig,
          connectionServers: { ioConnection, app },
        } = await getHotReloadConfigs({
          connectionManager: this,
          connection,
          databaseConfig,
          stateDatabaseConfig,
          _dbs,
          dbs,
        });
        const watchSchema = connection.db_watch_shema ? "*" : false;
        const getForkedProcRunner = async () => {
          if (
            !this.getActiveConnectionSilentFail(connection.id)?.methodRunner
          ) {
            const methodRunner = await ForkedPrglProcRunner.create({
              type: "run",
              dbConfId: databaseConfig.id,
              pass_process_env_vars_to_server_side_functions:
                databaseConfig.pass_process_env_vars_to_server_side_functions,
              dbs,
              prglInitOpts: {
                dbConnection: {
                  ...connectionInfo,
                  application_name: "methodRunner",
                },
                watchSchema,
              },
            });

            const activeConnection = this.getActiveConnection(connection.id);
            this.prglConnections.set(connection.id, {
              ...activeConnection,
              methodRunner,
            });
          }
          const forkedPrglProcRunner = this.getActiveConnection(
            connection.id,
          ).methodRunner;
          return forkedPrglProcRunner!;
        };
        const tableConfigRunner = await this.setTableConfig(
          connection.id,
          databaseConfig,
          connectionInfo,
        ).catch((e) => {
          void dbs.alerts.insert({
            severity: "error",
            message: "Table config was disabled due to error",
            database_config_id: databaseConfig.id,
            connection_id: connection.id,
            section: "table_config",
            data: getSerialisableError(e),
          });
          void dbs.database_configs.update(
            { id: databaseConfig.id },
            { table_config_ts_disabled: true },
          );
        });
        const onMountRunner = await this.setOnMount(
          databaseConfig.id,
          connection,
          connectionInfo,
        ).catch((e) => {
          void dbs.alerts.insert({
            severity: "error",
            message:
              "On mount was disabled due to error " +
              `\n\n${JSON.stringify(getErrorAsObject(e))}`,
            database_config_id: databaseConfig.id,
            connection_id: connection.id,
            section: "methods",
          });
          void dbs.connections.update(
            { id: connection.id },
            { on_mount_ts_disabled: true },
          );
        });

        const prgl = await prostgles<void, SUser>({
          dbConnection: connectionInfo,
          ...hotReloadConfig,
          watchSchema,
          disableRealtime: connection.disable_realtime ?? undefined,
          transactions: true,
          joins: "inferred",
          publish: getConnectionPublish({
            dbs,
            dbConf: databaseConfig,
            connection: connection,
          }),
          functions: getConnectionServerFunctions({
            dbConf: databaseConfig,
            dbs,
            con: connection,
            getForkedProcRunner,
          }),
          // DEBUG_MODE: true,
          onConnectionError: (error) => {
            const nonReconnectableErrorCodes = {
              "3D000": "Database does not exist",
              "28P01": "Invalid authentication credentials",
            };
            const errorCode = (error as AnyObject | undefined)?.code as string;
            if (errorCode && errorCode in nonReconnectableErrorCodes) {
              void this.disconnect(connection.id);
            }
          },
          publishRawSQL: async ({ user }) => {
            if (user?.type === "admin") {
              return true;
            }
            const ac = await getAccessRule(
              dbs,
              user,
              databaseConfig.id,
              connection.id,
            );
            if (
              ac?.dbPermissions.type === "Run SQL" &&
              ac.dbPermissions.allowSQL
            ) {
              return true;
            }
            return false;
          },
          onLog: (e) => {
            addLog(e, connectionId);
          },
          onReady: getConnectionOnReady({
            connectionManager: this,
            dbs,
            connection: connection,
            databaseConfig,
            onSetupReady: () => {
              setInitState({ onReadyCalled: true });
            },
          }),
        });
        this.prglConnections.set(connection.id, {
          state: "started",
          io: ioConnection,
          app,
          prgl,
          dbConf: databaseConfig,
          connectionInfo,
          socketPath,
          socketUrl,
          con: connection,
          isReady: false,
          methodRunner: undefined, // Set up later on demand
          onMountRunner: onMountRunner ?? undefined,
          tableConfigRunner: tableConfigRunner ?? undefined,
          isSuperUser: await getIsSuperUser(prgl._db),
          lastRestart: Date.now(),
        });
        void this.setSyncUserSub();
        setInitState({ prglReady: true });
      } catch (e) {
        reject(e);
        this.prglConnections.set(connection.id, {
          state: "error",
          error: e,
          socketPath,
          socketUrl,
          con: connection,
        });
      }
    },
  );

  this.prglConnections.set(connection.id, {
    state: "initializing",
    con: connection,
    initPromise: (async () => {
      try {
        await result;
      } catch (e) {
        console.error(e);
      }
      const existing = this.prglConnections.get(connection.id);
      if (!existing || existing.state === "initializing") {
        throw (
          "Initialization failed. Could not find a valid instance " +
          existing?.state
        );
      }
      return existing;
    })(),
  });

  return result;
};

export const getAccessRule = async (
  dbs: DBOFullyTyped<DBGeneratedSchema>,
  user: User | undefined,
  database_id: number,
  connection_id: string,
): Promise<DBSSchema["access_control"] | undefined> => {
  if (!user) return undefined;
  return await dbs.access_control.findOne({
    $and: [
      {
        database_id,
        $existsJoined: {
          access_control_user_types: {
            user_type: user.type,
          },
        },
      },
      {
        $existsJoined: {
          access_control_connections: {
            connection_id,
          },
        },
      },
    ],
  });
};

console.error("MUST NOT START STATEDB BUT REUSEIT");
