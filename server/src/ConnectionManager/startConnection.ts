import prostgles from "prostgles-server";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import type { PRGLIOSocket } from "prostgles-server/dist/DboBuilder";
import { getIsSuperUser, type DB } from "prostgles-server/dist/Prostgles";
import type { JSONBColumnDef } from "prostgles-server/dist/TableConfig/TableConfig";
import type { AnyObject, MethodFullDef } from "prostgles-types";
import { omitKeys, pickKeys } from "prostgles-types";
import { Server } from "socket.io";
import type { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
import type { CustomTableRules, DBSSchema, TableRules } from "../../../commonTypes/publishUtils";
import { parseTableRules } from "../../../commonTypes/publishUtils";
import { getAuth } from "../authConfig/authConfig";
import { testDBConnection } from "../connectionUtils/testDBConnection";
import { log, restartProc } from "../index";
import type { ConnectionManager, User } from "./ConnectionManager";
import { DB_TRANSACTION_KEY, getReloadConfigs } from "./ConnectionManager";
import { ForkedPrglProcRunner } from "./ForkedPrglProcRunner";
import { alertIfReferencedFileColumnsRemoved, getCompiledTS } from "./connectionManagerUtils";
import { addLog } from "../Logger";

export const startConnection = async function (
  this: ConnectionManager,
  con_id: string, 
  dbs: DBOFullyTyped<DBSchemaGenerated>,
  _dbs: DB,
  socket?: PRGLIOSocket,
  restartIfExists = false
): Promise<string | undefined> {
  const { http } = this;

  if (this.prgl_connections[con_id]) {
    if (restartIfExists) {
      await this.prgl_connections[con_id]?.prgl?.destroy();
      delete this.prgl_connections[con_id];
    } else {
      if (this.prgl_connections[con_id]?.error) {
        throw this.prgl_connections[con_id]?.error;
      }
      return this.prgl_connections[con_id]?.socket_path;
    }
  }

  const con = await dbs.connections.findOne({ id: con_id })
    .catch(e => {
      console.error(142, e);
      return undefined
    });
  if (!con) throw "Connection not found";
  const dbConf = await dbs.database_configs.findOne({ $existsJoined: { connections: { id: con.id } } });
  if (!dbConf) throw "dbConf not found";

  const { connectionInfo, isSSLModeFallBack } = await testDBConnection(con)
  log("testDBConnection ok" + (isSSLModeFallBack ? ". (sslmode=prefer fallback)" : ""))

  const socket_path = `${this.getConnectionPath(con_id)}-dashboard/s`;

  try {
    const prglInstance = this.prgl_connections[con.id];
    if (prglInstance) {
      // When does the socket path change??!!!
      if (prglInstance.socket_path !== socket_path) {

        restartProc(() => {
          socket?.emit("pls-restart", true)
        })

        if (prglInstance.prgl) {
          log("destroying prgl", Object.keys(prglInstance));
          prglInstance.prgl.destroy()
        }
      } else {
        log("reusing prgl", Object.keys(prglInstance));
        if (prglInstance.error) throw prglInstance.error;
        return socket_path;
      }
    }
    log("creating prgl", Object.keys(prglInstance || {}))
    this.prgl_connections[con.id] = {
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

    const _io = new Server(http, { path: socket_path, maxHttpBufferSize: 1e8, cors: this.withOrigin });

    try {
      const hotReloadConfig = await getReloadConfigs.bind(this)(con, dbConf, dbs);
      const auth = getAuth(this.app);
      const watchSchema = con.db_watch_shema ? "*" : false; 
      const forkedPrglProcRunner = await ForkedPrglProcRunner.create({ type: "run", dbConfId:dbConf.id, dbs ,initArgs: { dbConnection: connectionInfo, watchSchema } });

      await this.setTableConfig(con.id, dbConf.table_config_ts, dbConf.table_config_ts_disabled)
        .catch(e => {
          dbs.alerts.insert({ severity: "error", message: "Table config was disabled due to error", database_config_id: dbConf.id });
          dbs.database_configs.update({ id: dbConf.id }, { table_config_ts_disabled: true });
        });
      await this.setOnMount(con.id, dbConf.on_mount_ts, dbConf.on_mount_ts_disabled)
        .catch(e => {
          dbs.alerts.insert({ severity: "error", message: "On mount was disabled due to error", database_config_id: dbConf.id });
          dbs.database_configs.update({ id: dbConf.id }, { on_mount_ts_disabled: true });
        });

      //@ts-ignored
      const prgl = await prostgles({
        dbConnection: connectionInfo,
        io: _io,
        auth: {
          sidKeyName: auth.sidKeyName,
          getUser: (sid, __, _, cl) => auth.getUser(sid, dbs, _dbs, cl),
          login: (sid, __, _, ip_address) => auth.login(sid, dbs, _dbs, ip_address),
          logout: (sid, __, _) => auth.logout(sid, dbs, _dbs),
          cacheSession: {
            getSession: (sid) => auth.cacheSession.getSession(sid, dbs)
          }
        },
        ...hotReloadConfig,
        watchSchema,
        disableRealtime: con.disable_realtime ?? undefined,
        transactions: DB_TRANSACTION_KEY,
        joins: "inferred",
        //@ts-ignore
        publish: async ({ user, dbo, tables }) => {
          if (user) {
            if (user.type === "admin") {
              return "*";
            }

            const ac = await getACRule(dbs, user, dbConf.id);

            if (ac) {
              const { dbPermissions } = ac;

              if (dbPermissions.type === "Run SQL" && dbPermissions.allowSQL) {
                return "*" as const;

              } else if (dbPermissions.type === "All views/tables" && dbPermissions.allowAllTables.length) {

                return Object.keys(dbo).filter(k => dbo[k]!.find).reduce((a, v) => ({
                  ...a, [v]: {
                    select: dbPermissions.allowAllTables.includes("select") ? "*" : undefined,
                    ...(dbo[v]?.is_view ? {} : {
                      update: dbPermissions.allowAllTables.includes("update") ? "*" : undefined,
                      insert: dbPermissions.allowAllTables.includes("insert") ? "*" : undefined,
                      delete: dbPermissions.allowAllTables.includes("delete") ? "*" : undefined,
                    })
                  }
                }), {})
              } else if (dbPermissions.type === "Custom") {

                type ParsedTableRules = Record<string, TableRules>;
                const publish = dbPermissions.customTables
                  .filter((t: any) => dbo[t.tableName])
                  .reduce((a: any, _v) => {
                    const v = _v as CustomTableRules["customTables"][number];
                    const table = tables.find(({ name }) => name === v.tableName);
                    if (!table) return {};

                    const ptr: ParsedTableRules = {
                      ...a,
                      [v.tableName]: parseTableRules(omitKeys(v, ["tableName"]), dbo[v.tableName]!.is_view, table.columns.map((c: any) => c.name), { user: user as DBSSchema["users"] })
                    }
                    return ptr;
                  }, {} as ParsedTableRules);

                return publish;
              } else {
                console.error("Unexpected access control rule: ", (ac as any).rule)
              }
            }
          }
          return undefined
        },

        publishMethods: async ({ user }) => {
          const result: Record<string, MethodFullDef> = {};

          /** Admin has access to all methods */
          let allowedMethods: DBSSchema["published_methods"][] = []
          if (user?.type === "admin") {
            allowedMethods = await dbs.published_methods.find({ connection_id: con.id });

          } else {
            const ac = await getACRule(dbs, user, dbConf.id);
            if (ac) {
              allowedMethods = await dbs.published_methods.find({ connection_id: con.id, $existsJoined: { access_control_methods: { access_control_id: ac.id } } })
            }
          }

          allowedMethods.forEach(m => {

            result[m.name] = {
              input: m.arguments.reduce((a, v) => ({ ...a, [v.name]: v }), {}), // v.type === "Lookup"? { lookup: v }: v
              outputTable: m.outputTable ?? undefined,
              run: async (args) => {

                const sourceCode = getCompiledTS(m.run)

                try {

                  let validatedArgs: AnyObject | undefined = undefined;
                  if (m.arguments.length) {
                    /**
                     * Validate args
                     */
                    for await (const arg of m.arguments) {
                      let argType = omitKeys(arg, ["name"]);
                      if (arg.type === "Lookup" || arg.type === "Lookup[]") {
                        argType = {
                          ...omitKeys(arg, ["type", "name", "optional"]),
                          lookup: {
                            ...arg.lookup,
                            type: "data"
                          }
                        } as any
                      }
                      const partialArgSchema: JSONBColumnDef["jsonbSchema"] = {
                        //@ts-ignore
                        type: { [arg.name]: argType }
                      }
                      const partialValue = pickKeys(args, [arg.name]);

                      try {
                        await _dbs.any("SELECT validate_jsonb_schema(${argSchema}::TEXT, ${args})", { args: partialValue, argSchema: partialArgSchema });
                      } catch (error) {
                        throw {
                          message: "Could not validate argument against schema",
                          argument: arg.name,
                          error
                        }
                      }
                    }
                    validatedArgs = args;
                  }

                  return forkedPrglProcRunner.run({
                    type: "run",
                    code: sourceCode,
                    validatedArgs,
                    //@ts-ignore
                    user,
                  });

                } catch (err: any) {
                  return Promise.reject(err);
                }

              }
            }
          })


          return result;
        },
        DEBUG_MODE: true,
        publishRawSQL: async ({ user }) => {
          if (user?.type === "admin") {
            return true;
          }
          const ac = await getACRule(dbs, user, dbConf.id);
          if (ac?.dbPermissions.type === "Run SQL" && ac.dbPermissions.allowSQL) {
            return true;
          }
          return false
        },
        onLog: async (e) => {
          addLog(e, con_id);
        },
        onReady: async (params) => {
          const { dbo: db, db: _db, reason, tables } = params;
          if(this.prgl_connections[con.id]) {
            if(this.prgl_connections[con.id]!.prgl){
              this.prgl_connections[con.id]!.prgl!._db = _db;
              this.prgl_connections[con.id]!.prgl!.db = db;
            }
            this.prgl_connections[con.id]!.lastRestart = Date.now();
          }
          if(reason.type !== "prgl.restart" && reason.type !== "init"){
            this.onConnectionReload(con.id, dbConf.id);
          }

          alertIfReferencedFileColumnsRemoved.bind(this)({ reason, tables, connId: con.id, db: _db });
          console.log("onReady connection", Object.keys(db));

          /**
           * In some cases watchSchema does not work as expected (GRANT/REVOKE will not be observable to a less privileged db user)
           */
          const refreshSamedatabaseForOtherUsers = async () => {
            const sameDbs = await dbs.connections.find({
              "id.<>": con.id,
              ...pickKeys(con, ["db_host", "db_port", "db_name"])
            });
            sameDbs.forEach(({ id }) => {
              if (this.prgl_connections[id]) {
                this.prgl_connections[id]!.isReady = false
                this.prgl_connections[id]?.prgl?.restart();
              }
            });
          }
          //@ts-ignore
          const isNotRecursive = reason.type !== "prgl.restart";
          if (this.prgl_connections[con.id]?.isReady && isNotRecursive) {
            refreshSamedatabaseForOtherUsers();
          }

          resolve(socket_path);
          if (this.prgl_connections[con.id]) {
            this.prgl_connections[con.id]!.isReady = true;
          }
          console.log("dbProj ready", con.db_name)
        }
      });
      this.prgl_connections[con.id] = {
        prgl,
        dbConf,
        connectionInfo,
        socket_path,
        con,
        isReady: false,
        methodRunner: forkedPrglProcRunner,
        onMountRunner: this.prgl_connections[con.id]?.onMountRunner,
        tableConfigRunner: this.prgl_connections[con.id]?.tableConfigRunner,
        isSuperUser: await getIsSuperUser(prgl._db),
        lastRestart: Date.now()
      };
      this.setSyncUserSub()
    } catch (e) {
      reject(e)
      this.prgl_connections[con.id] = {
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
        isSuperUser: undefined
      }
    }

  })

}

export const getACRule = async (dbs: DBOFullyTyped<DBSchemaGenerated>, user: User | undefined, database_id: number): Promise<DBSSchema["access_control"] | undefined>  => {
  if(!user) return undefined;
  return await dbs.access_control.findOne({ database_id, $existsJoined: { access_control_user_types: { user_type: user.type } } });
}