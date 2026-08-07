import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { DBSSchema } from "@common/publishUtils";
import { API_ENDPOINTS } from "@common/utils";
import prostgles from "prostgles-server";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder/DBSchemaBuilder";
import type { PRGLIOSocket } from "prostgles-server/dist/DboBuilder/DboBuilder";
import type { InitResult } from "prostgles-server/dist/initProstgles";
import { getErrorAsObject } from "prostgles-server/dist/DboBuilder/dboBuilderUtils";
import { getIsSuperUser, type DB } from "prostgles-server/dist/Prostgles";
import { pickKeys, type AnyObject } from "prostgles-types";
import { addLog } from "../Logger";
import type { SUser } from "../authConfig/sessionUtils";
import { testDBConnection } from "../connectionUtils/testDBConnection";
import { log, restartProc } from "../index";
import type { ConnectionManager, User } from "./ConnectionManager";
import { getConnectionOnReady } from "./connectionOnReady";
import { getConnectionPublish } from "./getConnectionPublish";
import { getConnectionSocketPath } from "./getConnectionSocketPath";
import { getHotReloadConfigs } from "./getHotReloadConfigs";
import { getOnMount, getSchemaConfig } from "./connectionManagerUtils";
import type { ProstglesOnMountCleanup } from "../schemaConfig";

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
        await this.cleanupOnMount(existingConnection);
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

  if (!connection) {
    throw new Error("Connection not found");
  }
  if (connection.is_state_db) {
    return {
      socketPath: API_ENDPOINTS.WS_DBS,
      socketUrl: undefined,
    };
  }
  const databaseConfig = await dbs.database_configs.findOne({
    $existsJoined: { connections: { id: connection.id } },
  });
  if (!databaseConfig) {
    throw "databaseConfig not found";
  }
  const stateDatabaseConfig = await dbs.database_configs.findOne({
    $existsJoined: { connections: { is_state_db: true } },
  });
  if (!stateDatabaseConfig) {
    throw "State database config not found";
  }

  const { connectionInfo, isSSLModeFallBack } =
    await testDBConnection(connection);
  if (isSSLModeFallBack) {
    log(
      `testDBConnection ${JSON.stringify(connection.db_name)} switched to (sslmode=prefer fallback)`,
    );
  }

  const creatingPref = "connecting to " + JSON.stringify(connection.db_name);
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
        const watchSchema = connection.db_watch_schema ? "*" : (
          process.env.NODE_ENV !== "production" && databaseConfig.config_sync ?
            "hotReloadMode"
          : false
        );
        const schemaConfig = getSchemaConfig(databaseConfig);
        const {
          connection: _connectionConfig,
          databaseConfig: _databaseConfig,
          onInitSQL: _onInitSQL,
          onMount: _onMount,
          workspaces: _workspaces,
          ...schemaProstglesOptions
        } = schemaConfig ?? {};
        const onMount =
          connection.on_mount_ts_disabled ? undefined : (
            getOnMount({
              config_sync: databaseConfig.config_sync,
              on_mount_ts: connection.on_mount_ts,
            })
          );

        const { disable_realtime } = connection;
        let onMountCleanup: ProstglesOnMountCleanup | undefined;
        // eslint-disable-next-line prefer-const
        let prgl: InitResult<void, SUser>;
        let connectionStarted = false;
        const attachOnMountCleanup = () => {
          if (!connectionStarted || !onMountCleanup) return;
          const activeConnection = this.getActiveConnectionSilentFail(
            connection.id,
          );
          if (activeConnection?.prgl === prgl) {
            activeConnection.onMountCleanup = onMountCleanup;
          } else {
            void Promise.resolve(onMountCleanup()).catch((error: unknown) => {
              console.error("Error cleaning up an unmounted onMount", error);
            });
          }
        };
        const setOnMountCleanup = (
          cleanup: Awaited<ReturnType<NonNullable<typeof onMount>>>,
        ) => {
          if (typeof cleanup !== "function") return;
          onMountCleanup = cleanup;
          attachOnMountCleanup();
        };
        prgl = await prostgles<void, SUser>({
          ...schemaProstglesOptions,
          dbConnection: connectionInfo,
          ...hotReloadConfig,
          watchSchema,
          disableRealtime: disable_realtime ?? undefined,
          transactions: true,
          joins: schemaProstglesOptions.joins ?? "inferred",
          publish: getConnectionPublish({
            dbs,
            dbConf: databaseConfig,
            connection: connection,
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
          onReady: (params, update) => {
            if (onMount && params.reason.type === "init") {
              void Promise.resolve(onMount(params))
                .then(setOnMountCleanup)
                .catch((e: unknown) => {
                  void dbs.alerts.insert({
                    severity: "error",
                    message:
                      "On mount failed: " +
                      `\n\n${JSON.stringify(getErrorAsObject(e))}`,
                    database_config_id: databaseConfig.id,
                    connection_id: connection.id,
                    ui_path: { page: "/connection-config", section: "methods" },
                  });
                });
            }
            return getConnectionOnReady({
              connectionManager: this,
              dbs,
              connection,
              databaseConfig,
              onSetupReady: () => {
                setInitState({ onReadyCalled: true });
              },
            })(params, update);
          },
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
          onMountCleanup:
            typeof onMountCleanup === "function" ? onMountCleanup : undefined,
          isSuperUser: await getIsSuperUser(prgl._db),
          lastRestart: Date.now(),
        });
        connectionStarted = true;
        attachOnMountCleanup();
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
