import prostgles from "prostgles-server";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import type { PRGLIOSocket } from "prostgles-server/dist/DboBuilder/DboBuilder";
import { getErrorAsObject } from "prostgles-server/dist/DboBuilder/dboBuilderUtils";
import { getIsSuperUser, type DB } from "prostgles-server/dist/Prostgles";
import { pickKeys } from "prostgles-types";
import { Server } from "socket.io";
import type { DBGeneratedSchema } from "../../../commonTypes/DBGeneratedSchema";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import { addLog } from "../Logger";
import { getAuth } from "../authConfig/getAuth";
import { testDBConnection } from "../connectionUtils/testDBConnection";
import { log, restartProc } from "../index";
import type { ConnectionManager, User } from "./ConnectionManager";
import { getHotReloadConfigs } from "./ConnectionManager";
import { ForkedPrglProcRunner } from "./ForkedPrglProcRunner";
import { alertIfReferencedFileColumnsRemoved } from "./connectionManagerUtils";
import { getConnectionPublish } from "./getConnectionPublish";
import { getConnectionPublishMethods } from "./getConnectionPublishMethods";
import { getConnectionPaths } from "../../../commonTypes/utils";

export const startConnection = async function (
  this: ConnectionManager,
  con_id: string,
  dbs: DBOFullyTyped<DBGeneratedSchema>,
  _dbs: DB,
  socket?: PRGLIOSocket,
  restartIfExists = false,
): Promise<string | undefined> {
  const { http } = this;

  if (this.prglConnections[con_id]) {
    if (restartIfExists) {
      await this.prglConnections[con_id]?.prgl?.destroy();
      delete this.prglConnections[con_id];
    } else {
      if (this.prglConnections[con_id]?.error) {
        throw this.prglConnections[con_id]?.error;
      }
      return this.prglConnections[con_id]?.socket_path;
    }
  }

  const con = await dbs.connections.findOne({ id: con_id }).catch((e) => {
    console.error("Could not fetch connection", e);
    return undefined;
  });
  if (!con) throw "Connection not found";
  const dbConf = await dbs.database_configs.findOne({
    $existsJoined: { connections: { id: con.id } },
  });
  if (!dbConf) throw "dbConf not found";

  const { connectionInfo, isSSLModeFallBack } = await testDBConnection(con);
  log(
    "testDBConnection ok" +
      (isSSLModeFallBack ? ". (sslmode=prefer fallback)" : ""),
  );

  const socket_path = getConnectionPaths(con).ws;

  try {
    const prglInstance = this.prglConnections[con.id];
    if (prglInstance) {
      console.error("socket_path changed");
      if (prglInstance.socket_path !== socket_path) {
        restartProc(() => {
          socket?.emit("server-restart-request", true);
        });

        if (prglInstance.prgl) {
          log("destroying prgl", Object.keys(prglInstance));
          prglInstance.prgl.destroy();
        }
      } else {
        log("reusing prgl", Object.keys(prglInstance));
        if (prglInstance.error) throw prglInstance.error;
        return socket_path;
      }
    }
    log("creating prgl", con.db_name);
    this.prglConnections[con.id] = {
      io: undefined,
      socket_path,
      con,
      dbConf,
      isReady: false,
      connectionInfo,
      methodRunner: undefined,
      onMountRunner: undefined,
      tableConfigRunner: undefined,
      lastRestart: 0,
      isSuperUser: undefined,
    };
  } catch (e) {
    console.error(e);
    throw e;
  }

  return new Promise(async (resolve, reject) => {
    const _io = new Server(http, {
      path: socket_path,
      maxHttpBufferSize: 1e8,
      cors: this.withOrigin,
    });
    try {
      const global_settings = await dbs.global_settings.findOne();
      const hotReloadConfig = await getHotReloadConfigs(this, con, dbConf, dbs);
      const auth = await getAuth(this.app, dbs);
      const watchSchema = con.db_watch_shema ? "*" : false;
      const getForkedProcRunner = async () => {
        if (!this.prglConnections[con.id]?.methodRunner) {
          const methodRunner = await ForkedPrglProcRunner.create({
            type: "run",
            dbConfId: dbConf.id,
            pass_process_env_vars_to_server_side_functions:
              global_settings?.pass_process_env_vars_to_server_side_functions ??
              false,
            dbs,
            initArgs: {
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
        dbConf.table_config_ts,
        dbConf.table_config_ts_disabled,
      ).catch((e) => {
        dbs.alerts.insert({
          severity: "error",
          message: "Table config was disabled due to error",
          database_config_id: dbConf.id,
          connection_id: con.id,
          section: "table_config",
        });
        dbs.database_configs.update(
          { id: dbConf.id },
          { table_config_ts_disabled: true },
        );
      });
      await this.setOnMount(
        con.id,
        con.on_mount_ts,
        con.on_mount_ts_disabled,
      ).catch((e) => {
        dbs.alerts.insert({
          severity: "error",
          message:
            "On mount was disabled due to error" +
            `\n\n${JSON.stringify(getErrorAsObject(e))}`,
          database_config_id: dbConf.id,
          connection_id: con.id,
          section: "methods",
        });
        dbs.connections.update({ id: con.id }, { on_mount_ts_disabled: true });
      });

      const prgl = await prostgles({
        dbConnection: connectionInfo,
        io: _io,
        auth: {
          sidKeyName: auth.sidKeyName,
          getUser: (sid, __, _, cl) => auth.getUser(sid, dbs, _dbs, cl),
          cacheSession: {
            getSession: (sid) => auth.cacheSession.getSession(sid, dbs),
          },
        },
        ...hotReloadConfig,
        watchSchema,
        disableRealtime: con.disable_realtime ?? undefined,
        transactions: true,
        joins: "inferred",
        publish: getConnectionPublish({ dbs, dbConf, connectionId: con.id }),
        publishMethods: getConnectionPublishMethods({
          dbConf,
          dbs,
          con,
          _dbs,
          getForkedProcRunner,
        }),
        // DEBUG_MODE: true,
        publishRawSQL: async ({ user }) => {
          if (user?.type === "admin") {
            return true;
          }
          const ac = await getACRule(dbs, user, dbConf.id, con.id);
          if (
            ac?.dbPermissions.type === "Run SQL" &&
            ac.dbPermissions.allowSQL
          ) {
            return true;
          }
          return false;
        },
        onLog: async (e) => {
          addLog(e, con_id);
        },
        onReady: async (params) => {
          const { dbo: db, db: _db, reason, tables } = params;
          if (this.prglConnections[con.id]) {
            if (this.prglConnections[con.id]!.prgl) {
              this.prglConnections[con.id]!.prgl!._db = _db;
              this.prglConnections[con.id]!.prgl!.db = db;
            }
            this.prglConnections[con.id]!.lastRestart = Date.now();
          }
          if (reason.type !== "prgl.restart" && reason.type !== "init") {
            this.onConnectionReload(con.id, dbConf.id);
          }

          alertIfReferencedFileColumnsRemoved.bind(this)({
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
                this.prglConnections[id]!.isReady = false;
                this.prglConnections[id]?.prgl?.restart();
              }
            });
          };
          //@ts-ignore
          const isNotRecursive = reason.type !== "prgl.restart";
          if (this.prglConnections[con.id]?.isReady && isNotRecursive) {
            refreshSamedatabaseForOtherUsers();
          }

          resolve(socket_path);
          if (this.prglConnections[con.id]) {
            this.prglConnections[con.id]!.isReady = true;
          }
          console.log("dbProj ready", con.db_name);
        },
      });
      this.prglConnections[con.id] = {
        io: _io,
        prgl,
        dbConf,
        connectionInfo,
        socket_path,
        con,
        isReady: false,
        methodRunner: undefined,
        onMountRunner: this.prglConnections[con.id]?.onMountRunner,
        tableConfigRunner: this.prglConnections[con.id]?.tableConfigRunner,
        isSuperUser: await getIsSuperUser(prgl._db),
        lastRestart: Date.now(),
      };
      this.setSyncUserSub();
    } catch (e) {
      reject(e);
      this.prglConnections[con.id] = {
        io: _io,
        error: e,
        connectionInfo,
        dbConf,
        socket_path,
        con,
        isReady: false,
        methodRunner: undefined,
        onMountRunner: undefined,
        tableConfigRunner: undefined,
        lastRestart: 0,
        isSuperUser: undefined,
      };
    }
  });
};

export const getACRule = async (
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
