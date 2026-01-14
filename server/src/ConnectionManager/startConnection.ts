import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { DBSSchema } from "@common/publishUtils";
import { getConnectionPaths } from "@common/utils";
import type e from "express";
import prostgles from "prostgles-server";
import type { AuthConfig } from "prostgles-server/dist/Auth/AuthTypes";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder/DBSchemaBuilder";
import type { PRGLIOSocket } from "prostgles-server/dist/DboBuilder/DboBuilder";
import { getErrorAsObject } from "prostgles-server/dist/DboBuilder/dboBuilderUtils";
import { getIsSuperUser, type DB } from "prostgles-server/dist/Prostgles";
import { pickKeys, type AnyObject } from "prostgles-types";
import { Server } from "socket.io";
import { addLog } from "../Logger";
import { getAuth, withOrigin } from "../authConfig/getAuth";
import type { SUser } from "../authConfig/sessionUtils";
import {
  subscribeToAuthSetupChanges,
  type AuthConfigForStateOrConnection,
} from "../authConfig/subscribeToAuthSetupChanges";
import { testDBConnection } from "../connectionUtils/testDBConnection";
import { log, restartProc, type DBS } from "../index";
import type { ConnectionManager, User } from "./ConnectionManager";
import { getHotReloadConfigs } from "./ConnectionManager";
import { ForkedPrglProcRunner } from "./ForkedPrglProcRunner/ForkedPrglProcRunner";
import { alertIfReferencedFileColumnsRemoved } from "./connectionManagerUtils";
import { getConnectionPublish } from "./getConnectionPublish";
import { getConnectionServerFunctions } from "./getConnectionServerFunctions";

export const startConnection = async function (
  this: ConnectionManager,
  connectionId: string,
  dbs: DBOFullyTyped<DBGeneratedSchema>,
  _dbs: DB,
  socket?: PRGLIOSocket,
  restartIfExists = false,
): Promise<string | undefined> {
  const { http } = this;

  if (this.prglConnections[connectionId]) {
    if (restartIfExists) {
      await this.prglConnections[connectionId].prgl?.destroy();
      delete this.prglConnections[connectionId];
    } else {
      if (this.prglConnections[connectionId].error) {
        throw this.prglConnections[connectionId].error;
      }
      return this.prglConnections[connectionId].socket_path;
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

  const socket_path = getConnectionPaths(con).ws;

  const creatingPref = "connecting to " + con.db_name;
  try {
    const prglInstance = this.prglConnections[con.id];
    if (prglInstance) {
      console.error("socket_path changed");
      if (prglInstance.socket_path !== socket_path) {
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
        return socket_path;
      }
    }
    log(creatingPref);
    this.prglConnections[con.id] = {
      io: undefined,
      socket_path,
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

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  return new Promise<string>(async (resolve, reject) => {
    const database_config = await dbs.database_configs.findOne({
      $existsJoined: { connections: { id: connectionId } },
    });
    if (!database_config) {
      throw new Error("global_settings not found");
    }
    const _io = new Server(http, {
      path: socket_path,
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
        io: _io,
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
          const ac = await getAccessRule(dbs, user, databaseConfig.id, con.id);
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
        onReady: (params) => {
          const { dbo: db, db: _db, reason, tables } = params;

          const newAuthSetupDataListener = subscribeToAuthSetupChanges(
            dbs,
            async (authData) => {
              const auth = await getConnectionAuth(this.app, dbs, _dbs, {
                ...authData,
                type: "connection",
                url_path: con.url_path || "",
                database_config,
              });
              void prgl.update({
                auth,
              });
            },
            this.prglConnections[con.id]?.authSetupDataListener,
          );
          this.prglConnections[con.id]!.authSetupDataListener =
            newAuthSetupDataListener;
          if (this.prglConnections[con.id]) {
            if (this.prglConnections[con.id]!.prgl) {
              this.prglConnections[con.id]!.prgl!._db = _db;
              this.prglConnections[con.id]!.prgl!.db = db;
            }
            this.prglConnections[con.id]!.lastRestart = Date.now();
          }
          if (reason.type !== "prgl.restart" && reason.type !== "init") {
            this.onConnectionReload(con.id, databaseConfig.id);
          }

          void alertIfReferencedFileColumnsRemoved.bind(this)({
            reason,
            tables,
            connId: con.id,
            db: _db,
          });

          /**
           * In some cases watchSchema does not work as expected (GRANT/REVOKE will not be observable to a less privileged db user)
           */
          const refreshSamedatabaseForOtherUsers = async () => {
            const sameDbs = await dbs.connections.find({
              "id.<>": con.id,
              ...pickKeys(con, ["db_host", "db_port", "db_name"]),
            });
            sameDbs.forEach(({ id }) => {
              if (this.prglConnections[id]) {
                this.prglConnections[id].isReady = false;
                void this.prglConnections[id].prgl?.restart();
              }
            });
          };
          const isNotRecursive = reason.type !== "prgl.restart";
          if (this.prglConnections[con.id]?.isReady && isNotRecursive) {
            void refreshSamedatabaseForOtherUsers();
          }

          if (this.prglConnections[con.id]) {
            this.prglConnections[con.id]!.isReady = true;
          }
          resolve(socket_path);
          console.log("dbProj ready", con.db_name);
        },
      });
      this.prglConnections[con.id] = {
        io: _io,
        prgl,
        dbConf: databaseConfig,
        connectionInfo,
        socket_path,
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
        io: _io,
        error: e,
        connectionInfo,
        dbConf: databaseConfig,
        socket_path,
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
  });
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

const getConnectionAuth = async (
  app: e.Express,
  dbs: DBS,
  _dbs: DB,
  authData: AuthConfigForStateOrConnection,
) => {
  const auth = await getAuth(app, dbs, authData);
  if (!auth) return;
  // return auth as any;
  return {
    sidKeyName: auth.sidKeyName,
    getUser: (sid, __, _, cl, reqInfo) =>
      auth.getUser(sid, dbs, _dbs, cl, reqInfo),
    cacheSession: {
      getSession: (sid) => auth.cacheSession.getSession(sid, dbs),
    },
  } satisfies AuthConfig<void, SUser>;
};
