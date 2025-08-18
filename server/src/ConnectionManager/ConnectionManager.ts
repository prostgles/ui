import type { Express } from "express";
import type { Server as httpServer } from "http";
import path from "path";
import type pg from "pg-promise/typescript/pg-subset";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import type { Filter } from "prostgles-server/dist/DboBuilder/DboBuilderTypes";
import type { DB } from "prostgles-server/dist/Prostgles";
import type {
  FileTableConfig,
  ProstglesInitOptions,
} from "prostgles-server/dist/ProstglesTypes";
import type { InitResult } from "prostgles-server/dist/initProstgles";
import type { SubscriptionHandler } from "prostgles-types";
import { pickKeys } from "prostgles-types";
import type { DefaultEventsMap, Server } from "socket.io";
import type { DBGeneratedSchema } from "../../../common/DBGeneratedSchema";
import type { DBSSchema } from "../../../common/publishUtils";
import {
  API_ENDPOINTS,
  ROUTES,
  getConnectionPaths,
} from "../../../common/utils";
import type { SUser } from "../authConfig/sessionUtils";
import type { AuthSetupDataListener } from "../authConfig/subscribeToAuthSetupChanges";
import { getDbConnection } from "../connectionUtils/testDBConnection";
import { getRootDir } from "../electronConfig";
import type { Connections, DBS, DatabaseConfigs } from "../index";
import { connMgr } from "../index";
import { UNIQUE_DB_COLS } from "../tableConfig/tableConfig";
import { ForkedPrglProcRunner } from "./ForkedPrglProcRunner";
import {
  getCompiledTS,
  getRestApiConfig,
  getTableConfig,
  parseTableConfig,
} from "./connectionManagerUtils";
import { saveCertificates } from "./saveCertificates";
import { startConnection } from "./startConnection";
export type Unpromise<T extends Promise<any>> =
  T extends Promise<infer U> ? U : never;

export type ConnectionTableConfig = Pick<FileTableConfig, "referencedTables"> &
  Omit<Exclude<DatabaseConfigs["file_table_config"], null>, "referencedTables">;

export const DB_TRANSACTION_KEY = "dbTransactionProstgles" as const;

export type User = DBSSchema["users"];

export const getACRules = async (
  dbs: DBOFullyTyped<DBGeneratedSchema>,
  user: Pick<User, "type">,
): Promise<DBSSchema["access_control"][]> => {
  return await dbs.access_control.find({
    $existsJoined: { access_control_user_types: { user_type: user.type } },
  });
};

type DBWithUsers = { users?: Partial<DBS["users"]> };

type PRGLInstance = {
  socket_path: string;
  io:
    | Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
    | undefined;
  con: Connections;
  dbConf: DatabaseConfigs;
  prgl?: InitResult<void, SUser>;
  error?: any;
  connectionInfo: pg.IConnectionParameters<pg.IClient>;
  methodRunner: ForkedPrglProcRunner | undefined;
  tableConfigRunner: ForkedPrglProcRunner | undefined;
  onMountRunner: ForkedPrglProcRunner | undefined;
  isReady: boolean;
  lastRestart: number;
  isSuperUser: boolean | undefined;
  authSetupDataListener: AuthSetupDataListener | undefined;
};

export type HotReloadConfigOptions = Pick<
  ProstglesInitOptions,
  "fileTable" | "restApi" | "schemaFilter" // "tableConfig" |
>;
export const getHotReloadConfigs = async (
  conMgr: ConnectionManager,
  c: Connections,
  conf: DatabaseConfigs,
  dbs: DBS,
): Promise<HotReloadConfigOptions> => {
  const restApi = getRestApiConfig(conMgr, c, conf);
  const { fileTable } = await parseTableConfig({
    type: "saved",
    dbs,
    con: c,
    conMgr,
  });
  return {
    restApi,
    fileTable,
    /** TODO */
    schemaFilter: c.db_schema_filter ?? { public: 1 },
  };
};

export class ConnectionManager {
  prglConnections: Record<string, PRGLInstance> = {};
  http: httpServer;
  app: Express;
  // wss?: WebSocket.Server<WebSocket.WebSocket>;
  dbs?: DBS;
  db?: DB;
  connections?: Connections[];
  database_configs?: DatabaseConfigs[];

  constructor(http: httpServer, app: Express) {
    this.http = http;
    this.app = app;

    this.setUpWSS();
  }

  destroy = async () => {
    await this.conSub?.unsubscribe();
    await this.dbConfSub?.unsubscribe();
    await this.userSub?.unsubscribe();
    await Promise.all(
      this.accessControlListeners?.map((l) => l.unsubscribe()) ?? [],
    );
  };

  getConnectionsWithPublicAccess = () => {
    return this.dbConfigs.filter((c) =>
      c.access_control_user_types.some((u) => u.user_type === "public"),
    );
  };

  /**
   * If a connection was reloaded due to permissions change (revoke/grant) then
   * restart all other related connections that did not get this event
   *
   */
  onConnectionReload = (conId: string, dbConfId: number) => {
    const delay = 1000;
    setTimeout(() => {
      Object.entries(this.prglConnections).forEach(([_conId, prglCon]) => {
        if (
          conId !== _conId &&
          prglCon.dbConf.id === dbConfId &&
          prglCon.lastRestart < Date.now() - delay
        ) {
          void prglCon.prgl?.restart();
        }
      });
    }, delay);
  };

  setTableConfig = async (
    conId: string,
    table_config_ts: string | undefined | null,
    disabled: boolean | null,
  ) => {
    const prglCon = this.prglConnections[conId];
    if (!prglCon) throw "Connection not found";
    if (!this.dbs) throw "Dbs not ready";
    if (
      !disabled &&
      prglCon.tableConfigRunner?.opts.type === "tableConfig" &&
      prglCon.tableConfigRunner.opts.table_config_ts === table_config_ts
    )
      return;
    prglCon.tableConfigRunner?.destroy();
    prglCon.tableConfigRunner = undefined;
    if (disabled) return;
    await this.dbs.database_config_logs.update(
      { id: prglCon.dbConf.id },
      { table_config_logs: null },
    );
    if (table_config_ts) {
      const tableConfig = getTableConfig({
        table_config_ts,
        table_config: null,
      });
      prglCon.tableConfigRunner = await ForkedPrglProcRunner.create({
        dbs: this.dbs,
        type: "tableConfig",
        pass_process_env_vars_to_server_side_functions: false,
        table_config_ts,
        dbConfId: prglCon.dbConf.id,
        prglInitOpts: {
          dbConnection: {
            ...prglCon.connectionInfo,
            application_name: "tableConfig",
          },
          tableConfig,
        },
      });
      return 1;
    }
  };

  setOnMount = async (
    conId: string,
    on_mount_ts: string | undefined | null,
    disabled: boolean | null,
  ) => {
    const prglCon = this.prglConnections[conId];
    if (!prglCon) throw "Connection not found";
    if (!this.dbs) throw "Dbs not ready";
    if (
      !disabled &&
      prglCon.onMountRunner?.opts.type === "onMount" &&
      prglCon.onMountRunner.opts.on_mount_ts === on_mount_ts
    ) {
      return;
    }
    prglCon.onMountRunner?.destroy();
    prglCon.onMountRunner = undefined;

    if (disabled) return;
    await this.dbs.database_config_logs.update(
      { id: prglCon.dbConf.id },
      { on_mount_logs: null },
    );
    if (on_mount_ts) {
      const compiledCode = getCompiledTS(on_mount_ts);
      prglCon.onMountRunner = await ForkedPrglProcRunner.create({
        dbs: this.dbs,
        type: "onMount",
        on_mount_ts,
        on_mount_ts_compiled: compiledCode,
        pass_process_env_vars_to_server_side_functions: false,
        dbConfId: prglCon.dbConf.id,
        prglInitOpts: {
          dbConnection: {
            ...prglCon.connectionInfo,
            application_name: "onMount",
          },
        },
      });
      /** Not awaited not block opening the connection */
      void prglCon.onMountRunner.run({
        type: "onMount",
        code: compiledCode,
      });
    }
  };

  syncUsers = async (
    db: DBWithUsers,
    userTypes: string[],
    syncableColumns: (keyof DBSSchema["users"])[],
  ) => {
    if (!db.users || !this.dbs || !syncableColumns.length) return;
    const lastUpdateDb = await db.users.findOne?.(
      {},
      { select: { last_updated: 1 }, orderBy: { last_updated: -1 } },
    );
    const lastUpdateDbs = await this.dbs.users.findOne(
      { "type.$in": userTypes },
      { select: { last_updated: 1 }, orderBy: { last_updated: -1 } },
    );
    if (
      (lastUpdateDbs?.last_updated && !lastUpdateDb?.last_updated) ||
      (lastUpdateDbs?.last_updated &&
        +(lastUpdateDb?.last_updated || 0) < +lastUpdateDbs.last_updated)
    ) {
      const newUsers = await this.dbs.users.find(
        {
          "type.$in": userTypes,
          "last_updated.>": lastUpdateDb?.last_updated ?? 0,
        } as Filter,
        { limit: 1000, orderBy: { last_updated: 1 } },
      );
      if (newUsers.length) {
        await db.users.insert?.(
          newUsers.map((u) => pickKeys(u, syncableColumns)),
          { onConflict: "DoUpdate" },
        );
        void this.syncUsers(db, userTypes, syncableColumns);
      }
    }
  };

  userSub?: SubscriptionHandler | undefined;
  setSyncUserSub = async () => {
    await this.userSub?.unsubscribe();
    this.userSub = await this.dbs?.users.subscribe(
      {},
      { throttle: 1e3 },
      async (users) => {
        for (const prglCon of Object.values(this.prglConnections)) {
          const db = prglCon.prgl?.db as DBWithUsers | undefined;
          const dbUsersHandler = db?.users;
          const dbConf = await this.dbs?.database_configs.findOne({
            id: prglCon.dbConf.id,
          });
          if (dbUsersHandler && dbConf?.sync_users) {
            const userTypes = await this.dbs?.access_control_user_types.find(
              {
                $existsJoined: {
                  ["**.connections" as "connections"]: { id: prglCon.con.id },
                },
              },
              {
                select: { user_type: 1 },
                returnType: "values",
              },
            );
            const dbCols = await dbUsersHandler.getColumns?.();
            const dbsCols = await this.dbs?.users.getColumns();
            if (!dbCols || !dbsCols) return;
            const requiredColumns = ["id", "last_updated"] as const;
            const excludedColumns = ["password"];
            const syncableColumns = dbsCols
              .filter((c) =>
                dbCols.some(
                  (dc) =>
                    dc.insert &&
                    dc.name === c.name &&
                    dc.udt_name === c.udt_name,
                ),
              )
              .map((c) => c.name)
              .filter(
                (c) => !excludedColumns.includes(c),
              ) as (keyof DBSSchema["users"])[];
            if (
              userTypes &&
              requiredColumns.every((c) => syncableColumns.includes(c))
            ) {
              void this.syncUsers(db, userTypes, syncableColumns);
            }
          }
        }
      },
    );
  };
  conSub?: SubscriptionHandler | undefined;
  dbConfSub?: SubscriptionHandler | undefined;
  dbConfigs: (DBSSchema["database_configs"] & {
    connections: { id: string }[];
    access_control_user_types: {
      user_type: string;
      access_control_id: number;
    }[];
  })[] = [];
  init = async (dbs: DBS, db: DB) => {
    this.dbs = dbs;
    this.db = db;

    await this.conSub?.unsubscribe();
    this.conSub = await this.dbs.connections.subscribe(
      {},
      {},
      (connections) => {
        saveCertificates(connections);
        connections.forEach((updatedConnection) => {
          const prglCon = this.prglConnections[updatedConnection.id];
          const currentConnection = this.connections?.find(
            (ccon) => ccon.id === updatedConnection.id,
          );
          if (
            prglCon?.io &&
            currentConnection &&
            currentConnection.url_path !== updatedConnection.url_path
          ) {
            prglCon.io.path(getConnectionPaths(updatedConnection).ws);
          }
        });
        this.connections = connections;
      },
    );

    await this.dbConfSub?.unsubscribe();
    this.dbConfSub = await this.dbs.database_configs.subscribe(
      {},
      {
        select: {
          "*": 1,
          connections: { id: 1 },
          access_control_user_types: "*",
        },
      },
      async (dbConfigs: typeof this.dbConfigs) => {
        this.dbConfigs = dbConfigs;
        for (const conf of dbConfigs) {
          for (const c of conf.connections) {
            const prglCon = this.prglConnections[c.id];
            if (prglCon?.prgl && !prglCon.con.is_state_db) {
              const con = await this.getConnectionData(c.id);
              const hotReloadConfig = await getHotReloadConfigs(
                this,
                con,
                conf,
                dbs,
              );
              /** Can happen due to error in onMount */
              await prglCon.prgl.update(hotReloadConfig).catch((e) => {
                console.error(
                  `Error updating connection ${con.id} with hot reload config`,
                  e,
                  { hotReloadConfig },
                );
              });
              await this.setSyncUserSub();
            }
          }
        }
        this.database_configs = dbConfigs;
      },
    );

    /** Start connections if accessed */
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.app.use(async (req, res, next) => {
      const { url } = req;
      if (
        this.connections &&
        url.startsWith(API_ENDPOINTS.WS_DB) &&
        !Object.keys(this.prglConnections).some((connId) =>
          url.includes(connId),
        )
      ) {
        const offlineConnection = this.connections.find((c) =>
          url.includes(c.id),
        );
        if (offlineConnection && this.dbs && this.db) {
          await this.startConnection(offlineConnection.id, this.dbs, this.db);
        }
      }
      next();
    });

    await this.accessControlHotReload();
  };

  accessControlSkippedFirst = false;
  accessControlListeners?: SubscriptionHandler[];
  accessControlHotReload = async () => {
    if (!this.dbs || this.accessControlListeners?.length) return;
    const onAccessChange = (connIds: string[]) => {
      if (!this.accessControlSkippedFirst) {
        this.accessControlSkippedFirst = true;
        return;
      }
      console.log("onAccessChange");
      return Promise.all(
        connIds.map((connection_id) => {
          return this.prglConnections[connection_id]?.prgl?.restart();
        }),
      );
    };
    this.accessControlListeners = [
      await this.dbs.access_control.subscribe(
        {},
        {
          select: {
            database_id: 1,
            access_control_user_types: { access_control_id: 1 },
            access_control_methods: { access_control_id: 1 },
          },
          throttle: 1000,
          throttleOpts: {
            skipFirst: true,
          },
        },
        async (connections) => {
          const dbIds = Array.from(
            new Set(connections.map((c) => c.database_id)),
          );
          const d: { connIds?: string[] } | undefined =
            await this.dbs?.connections.findOne(
              { $existsJoined: { database_configs: { id: { $in: dbIds } } } },
              { select: { connIds: { $array_agg: ["id"] } } },
            );
          await onAccessChange(d?.connIds ?? []);
          await this.setSyncUserSub();
        },
      ),
    ];
  };

  setUpWSS() {
    // if(!this.wss){
    //   this.wss = new WebSocket.Server({ port: 3004, path: "/here" });
    // }
    // const clients = new Map();
    // this.wss.on('connection', (ws) => {
    //   const id = Date.now() + "." + Math.random()
    //   const color = Math.floor(Math.random() * 360);
    //   const metadata = { id, color };
    //   clients.set(ws, metadata);
    //   ws.on("message", console.log)
    //   ws.on("close", () => {
    //     clients.delete(ws);
    //   });
    // });
    // return this.wss;
  }

  getFileFolderPath(conId?: string) {
    const rootPath = path.resolve(`${getRootDir()}${ROUTES.STORAGE}`);
    if (!conId) return rootPath;
    const conn = this.connections?.find((c) => c.id === conId);
    if (!conn) throw "Connection not found";
    const conPath = UNIQUE_DB_COLS.map((f) => conn[f]).join("_");
    return `${rootPath}/${conPath}`;
  }

  getConnectionDb(
    conId: string,
  ): Required<PRGLInstance>["prgl"]["db"] | undefined {
    return this.prglConnections[conId]?.prgl?.db;
  }

  async getNewConnectionDb(
    connId: string,
    opts?: pg.IConnectionParameters<pg.IClient>,
  ) {
    return getDbConnection(await this.getConnectionData(connId), opts);
  }

  getConnection(
    conId: string,
  ): PRGLInstance & Pick<Required<PRGLInstance>, "prgl"> {
    const c = this.prglConnections[conId];
    if (!c?.prgl) {
      throw "Connection not found";
    }
    return c as PRGLInstance & Pick<Required<PRGLInstance>, "prgl">;
  }

  getConnections() {
    return this.prglConnections;
  }

  async disconnect(conId: string): Promise<boolean> {
    await cdbCache[conId]?.destroy();
    const conn = this.prglConnections[conId];
    if (conn) {
      conn.methodRunner?.destroy();
      conn.tableConfigRunner?.destroy();
      conn.onMountRunner?.destroy();
      //TODO: fix re-started connection not working. Might need to use ws instead of socket.io
      await conn.prgl?.destroy();
      delete this.prglConnections[conId];
      return true;
    }
    return false;
  }

  async getConnectionData(connection_id: string) {
    const con = await this.dbs?.connections.findOne({ id: connection_id });
    if (!con) throw "Connection not found";

    return con;
  }

  setFileTable = async (
    con: DBSSchema["connections"],
    newTableConfig: DatabaseConfigs["file_table_config"],
  ) => {
    const prgl = this.prglConnections[con.id]?.prgl;
    const dbs = this.dbs;
    if (!dbs || !prgl) return;

    const { fileTable } = await parseTableConfig({
      type: "new",
      dbs,
      con,
      conMgr: this,
      newTableConfig,
    });
    await prgl.update({ fileTable });
  };

  startConnection = startConnection.bind(this);
}

export const cdbCache: Record<
  string,
  {
    db: DB;
    isSuperUser?: boolean;
    hasSuperUser?: boolean;
    destroy: () => Promise<void>;
  }
> = {};
export const getCDB = async (
  connId: string,
  opts?: pg.IConnectionParameters<pg.IClient>,
  isTemporary = false,
) => {
  if (!cdbCache[connId] || cdbCache[connId].db.$pool.ending || isTemporary) {
    const destroy: () => Promise<void> = async () => {
      await db.$pool.end();
      delete cdbCache[connId];
    };
    const db = await connMgr.getNewConnectionDb(connId, {
      application_name: "prostgles getCDB",
      ...opts,
    });
    if (isTemporary) return { db, destroy };
    cdbCache[connId] = {
      db,
      destroy,
    };
  }

  return cdbCache[connId];
};
export const getSuperUserCDB = async (connId: string, dbs: DBS) => {
  const dbInfo = await getCDB(connId);
  if (dbInfo.isSuperUser) return dbInfo;
  const connIdSuperUser = `${connId}_super_user`;
  if (dbInfo.hasSuperUser === false) {
    return dbInfo;
  } else if (dbInfo.hasSuperUser === true) {
    const su = cdbCache[connIdSuperUser];
    if (!su) throw "No super user db found";
    return su;
  }
  const _superUsers: { usename: string; is_current_user: boolean }[] =
    await dbInfo.db.any(
      `
    SELECT usename, "current_user"() = usename as is_current_user
    FROM pg_user WHERE usesuper = true
    `,
      {},
    );

  if (_superUsers.some((s) => s.is_current_user)) {
    cdbCache[connId]!.isSuperUser = true;
    cdbCache[connId]!.hasSuperUser = true;
    return dbInfo;
  }

  const superUsers = _superUsers.map((u) => u.usename);

  const conn = await dbs.connections.findOne({ id: connId });
  const connsWithSuperUser = await dbs.connections.find({
    db_host: conn!.db_host,
    db_port: conn!.db_port,
    db_user: { $in: superUsers },
  });

  const firstConn = connsWithSuperUser[0];
  if (firstConn) {
    const dbSu = await getCDB(
      connId,
      { user: firstConn.db_user, password: firstConn.db_pass! },
      true,
    );
    cdbCache[connIdSuperUser] = {
      ...dbSu,
      isSuperUser: true,
      hasSuperUser: true,
    };
    cdbCache[connId]!.hasSuperUser = true;
    return cdbCache[connIdSuperUser];
  }
  cdbCache[connId]!.hasSuperUser = false;
  cdbCache[connId]!.isSuperUser = false;

  return dbInfo;
};
