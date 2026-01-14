import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { DBSSchema } from "@common/publishUtils";
import { getConnectionPaths } from "@common/utils";
import { createHttpServer } from "@src/init/createHttpServer";
import prostgles from "prostgles-server";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder/DBSchemaBuilder";
import type { PRGLIOSocket } from "prostgles-server/dist/DboBuilder/DboBuilder";
import { getErrorAsObject } from "prostgles-server/dist/DboBuilder/dboBuilderUtils";
import { getIsSuperUser, type DB } from "prostgles-server/dist/Prostgles";
import { pickKeys, type AnyObject } from "prostgles-types";
import { Server } from "socket.io";
import { addLog } from "../Logger";
import { withOrigin } from "../authConfig/getAuth";
import type { SUser } from "../authConfig/sessionUtils";
import { testDBConnection } from "../connectionUtils/testDBConnection";
import { log, restartProc } from "../index";
import type { ConnectionManager, User } from "./ConnectionManager";
import { getHotReloadConfigs } from "./ConnectionManager";
import { ForkedPrglProcRunner } from "./ForkedPrglProcRunner/ForkedPrglProcRunner";
import { getConnectionOnReady } from "./connectionOnReady";
import { getConnectionPublish } from "./getConnectionPublish";
import { getConnectionServerFunctions } from "./getConnectionServerFunctions";

export const startConnection = async function (
  this: ConnectionManager,
  connectionId: string,
  dbs: DBOFullyTyped<DBGeneratedSchema>,
  _dbs: DB,
  socket?: PRGLIOSocket,
  restartIfExists = false,
): Promise<{ socketPath: string; socketUrl: string | undefined } | undefined> {
  if (this.prglConnections[connectionId]) {
    if (restartIfExists) {
      await this.prglConnections[connectionId].prgl?.destroy();
      delete this.prglConnections[connectionId];
    } else {
      if (this.prglConnections[connectionId].error) {
        throw this.prglConnections[connectionId].error;
      }
      return pickKeys(this.prglConnections[connectionId], [
        "socketPath",
        "socketUrl",
      ]);
    }
  }

  const con = await dbs.connections.findOne({ id: connectionId }).catch((e) => {
    console.error("Could not fetch connection", e);
    return undefined;
  });

  if (!con) throw "Connection not found";
  const databaseConfig = await dbs.database_configs.findOne({
    $existsJoined: { connections: { id: con.id } },
  });
  if (!databaseConfig) throw "databaseConfig not found";

  const { connectionInfo, isSSLModeFallBack } = await testDBConnection(con);
  log(
    "testDBConnection ok" +
      (isSSLModeFallBack ? ". (sslmode=prefer fallback)" : ""),
  );

  const socketPath = getConnectionPaths(con).ws;
  const socketUrl = !con.port ? undefined : `http://localhost:${con.port}`;

  const creatingPref = "connecting to " + con.db_name;
  try {
    const prglInstance = this.prglConnections[con.id];
    if (prglInstance) {
      console.error("socket_path changed");
      if (prglInstance.socketPath !== socketPath) {
        restartProc(() => {
          socket?.emit("server-restart-request", true);
        });

        if (prglInstance.prgl) {
          log("disconnecting from ", Object.keys(prglInstance.con.db_name));
          await prglInstance.prgl.destroy();
        }
      } else {
        log("reusing ", Object.keys(prglInstance));
        if (prglInstance.error) throw prglInstance.error;
        return { socketPath, socketUrl };
      }
    }
    log(creatingPref);
    this.prglConnections[con.id] = {
      io: undefined,
      socketPath,
      socketUrl,
      con,
      dbConf: databaseConfig,
      isReady: false,
      connectionInfo,
      methodRunner: undefined,
      onMountRunner: undefined,
      tableConfigRunner: undefined,
      lastRestart: 0,
      isSuperUser: undefined,
      authSetupDataListener: undefined,
    };
  } catch (e) {
    console.error(e);
    throw e;
  }

  return new Promise<{ socketPath: string; socketUrl: string | undefined }>(
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    async (resolve, reject) => {
      const database_config = await dbs.database_configs.findOne({
        $existsJoined: { connections: { id: connectionId } },
      });
      if (!database_config) {
        throw new Error("global_settings not found");
      }

      const httpServer =
        typeof con.port === "number" && !con.is_state_db ?
          createHttpServer(con.port)
        : this;
      const ioConnection = new Server(httpServer.http, {
        path: socketPath,
        maxHttpBufferSize: 1e8,
        cors: withOrigin,
      });

      try {
        const hotReloadConfig = await getHotReloadConfigs(
          this,
          con,
          databaseConfig,
          dbs,
        );
        const watchSchema = con.db_watch_shema ? "*" : false;
        const getForkedProcRunner = async () => {
          if (!this.prglConnections[con.id]?.methodRunner) {
            const methodRunner = await ForkedPrglProcRunner.create({
              type: "run",
              dbConfId: databaseConfig.id,
              pass_process_env_vars_to_server_side_functions:
                database_config.pass_process_env_vars_to_server_side_functions,
              dbs,
              prglInitOpts: {
                dbConnection: {
                  ...connectionInfo,
                  application_name: "methodRunner",
                },
                watchSchema,
              },
            });
            this.prglConnections[con.id]!.methodRunner = methodRunner;
          }
          const forkedPrglProcRunner =
            this.prglConnections[con.id]!.methodRunner!;
          return forkedPrglProcRunner;
        };
        await this.setTableConfig(
          con.id,
          databaseConfig.table_config_ts,
          databaseConfig.table_config_ts_disabled,
        ).catch((e) => {
          void dbs.alerts.insert({
            severity: "error",
            message: "Table config was disabled due to error",
            database_config_id: databaseConfig.id,
            connection_id: con.id,
            section: "table_config",
          });
          void dbs.database_configs.update(
            { id: databaseConfig.id },
            { table_config_ts_disabled: true },
          );
        });
        await this.setOnMount(
          con.id,
          con.on_mount_ts,
          con.on_mount_ts_disabled,
        ).catch((e) => {
          void dbs.alerts.insert({
            severity: "error",
            message:
              "On mount was disabled due to error" +
              `\n\n${JSON.stringify(getErrorAsObject(e))}`,
            database_config_id: databaseConfig.id,
            connection_id: con.id,
            section: "methods",
          });
          void dbs.connections.update(
            { id: con.id },
            { on_mount_ts_disabled: true },
          );
        });

        const prgl = await prostgles<void, SUser>({
          dbConnection: connectionInfo,
          io: ioConnection,
          ...hotReloadConfig,
          watchSchema,
          disableRealtime: con.disable_realtime ?? undefined,
          transactions: true,
          joins: "inferred",
          publish: getConnectionPublish({
            dbs,
            dbConf: databaseConfig,
            connection: con,
          }),
          functions: getConnectionServerFunctions({
            dbConf: databaseConfig,
            dbs,
            con,
            _dbs,
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
              // void this.startConnection(con.id, dbs, _dbs, undefined, true);
              void this.disconnect(con.id);
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
              con.id,
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
            _dbs,
            connection: con,
            databaseConfig: database_config,
            onSetupReady: () => {
              resolve({ socketPath, socketUrl });
            },
          }),
        });
        this.prglConnections[con.id] = {
          io: ioConnection,
          prgl,
          dbConf: databaseConfig,
          connectionInfo,
          socketPath,
          socketUrl,
          con,
          isReady: false,
          methodRunner: undefined,
          onMountRunner: this.prglConnections[con.id]?.onMountRunner,
          tableConfigRunner: this.prglConnections[con.id]?.tableConfigRunner,
          isSuperUser: await getIsSuperUser(prgl._db),
          lastRestart: Date.now(),
          authSetupDataListener:
            this.prglConnections[con.id]?.authSetupDataListener,
        };
        void this.setSyncUserSub();
      } catch (e) {
        reject(e);
        this.prglConnections[con.id] = {
          io: ioConnection,
          error: e,
          connectionInfo,
          dbConf: databaseConfig,
          socketPath,
          socketUrl,
          con,
          isReady: false,
          methodRunner: undefined,
          onMountRunner: undefined,
          tableConfigRunner: undefined,
          lastRestart: 0,
          isSuperUser: undefined,
          authSetupDataListener: undefined,
        };
      }
    },
  );
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
