import prostgles from "prostgles-server";
import { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import { PRGLIOSocket } from "prostgles-server/dist/DboBuilder";
import { DB } from "prostgles-server/dist/Prostgles";
import { JSONBColumnDef } from "prostgles-server/dist/TableConfig/TableConfig";
import { AnyObject, MethodFullDef, omitKeys, pickKeys } from "prostgles-types";
import { Server } from "socket.io";
import { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
import { CustomTableRules, DBSSchema, TableRules, parseTableRules } from "../../../commonTypes/publishUtils";
import { getAuth } from "../authConfig";
import { testDBConnection } from "../connectionUtils/testDBConnection";
import { log, restartProc } from "../index";
import { ConnectionManager, DB_TRANSACTION_KEY, User, getReloadConfigs } from "./ConnectionManager";
import { getCompiledTS } from "./connectionManagerUtils";

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
      if (prglInstance?.socket_path !== socket_path) {

        restartProc(() => {
          socket?.emit("pls-restart", true)
        })

        if (prglInstance?.prgl) {
          log("destroying prgl", Object.keys(prglInstance));
          prglInstance.prgl?.destroy()
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
      isReady: false,
    }

  } catch (e) {
    console.error(e);
    throw e;
  }

  return new Promise(async (resolve, reject) => {

    const _io = new Server(http, { path: socket_path, maxHttpBufferSize: 1e8, cors: this.withOrigin });

    try {
      const hotReloadConfig = await getReloadConfigs.bind(this)(con, dbConf, dbs);
      const auth = getAuth(this.app);

      //@ts-ignored
      const prgl = await prostgles({
        dbConnection: connectionInfo,
        io: _io,
        auth: {
          sidKeyName: auth.sidKeyName,
          getUser: (sid, __, _, cl) => auth.getUser(sid, dbs, _dbs, cl),
          login: (sid, __, _, ip_address) => auth.login?.(sid, dbs, _dbs, ip_address),
          logout: (sid, __, _) => auth.logout?.(sid, dbs, _dbs),
          cacheSession: {
            getSession: (sid) => auth.cacheSession.getSession(sid, dbs)
          }
        },
        ...hotReloadConfig,
        watchSchema: Boolean(con.db_watch_shema) ? "*" : false,
        transactions: DB_TRANSACTION_KEY,
        joins: "inferred",
        publish: async ({ user, dbo, tables }) => {
          if (user) {
            if (user.type === "admin") {
              return "*";
            }


            const ac = await getACRule(dbs, user as DBSSchema["users"], dbConf.id);

            if (ac) {
              const { dbPermissions } = ac;

              if (dbPermissions.type === "Run SQL" && dbPermissions.allowSQL) {
                return "*" as "*";

              } else if (dbPermissions.type === 'All views/tables' && dbPermissions.allowAllTables.length) {

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
              } else if (dbPermissions.type === "Custom" && dbPermissions.customTables) {

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

        publishMethods: async ({ db, dbo, socket, tables, user }) => {
          let result: Record<string, MethodFullDef> = {};

          /** Admin has access to all methods */
          let allowedMethods: DBSSchema["published_methods"][] = []
          if (user?.type === "admin") {
            allowedMethods = await dbs.published_methods.find({ connection_id: con.id });

          } else {
            const ac = await getACRule(dbs, user as any, dbConf.id);
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

                  /* We now expect the method to be: `exports.run = (args, { db, dbo, user }) => Promise<any>` */
                  eval(sourceCode);

                  const methodResult = await db.tx(dbTX => {
                    return exports.run(validatedArgs, { db: db, dbo: dbTX, socket, tables, user });
                  });

                  return methodResult;
                } catch (err: any) {
                  return Promise.reject(err);
                }

              }
            }
          })


          return result;
        },

        publishRawSQL: async ({ user }) => {
          if (user?.type === "admin") {
            return true;
          }
          const ac = await getACRule(dbs, user as any, dbConf.id);
          if (ac?.dbPermissions.type === "Run SQL" && ac.dbPermissions.allowSQL) {
            return true;
          }
          return false
        },

        onReady: async (db, _db, reason) => {
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
        // io,
        socket_path,
        con,
        isReady: false,
      }

    } catch (e) {
      reject(e)
      this.prgl_connections[con.id] = {
        error: e,
        // io,
        socket_path,
        con,
        isReady: false,
      }
    }

  })

}

export const getACRule = async (dbs: DBOFullyTyped<DBSchemaGenerated>, user: User, database_id: number): Promise<DBSSchema["access_control"] | undefined>  => {
  if(user){
    return await dbs.access_control.findOne({ database_id, $existsJoined: { access_control_user_types: { user_type: user.type } } });
  }
  return undefined
}