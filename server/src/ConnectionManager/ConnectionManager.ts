import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { DBSSchema } from "@common/publishUtils";
import { ROUTES } from "@common/utils";
import type { ConnectionDetails } from "@src/connectionUtils/getConnectionDetails";
import type { createHttpServer } from "@src/createHttpAndIOServers/createHttpServer";
import type { HttpAppSecurityOptions } from "@src/createHttpAndIOServers/setHttpAppSecurity";
import type e from "express";
import type { Express } from "express";
import type { Server as httpServer } from "http";
import path from "path";
import type pg from "pg-promise/typescript/pg-subset";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder/DBSchemaBuilder";
import type { Filter } from "prostgles-server/dist/DboBuilder/DboBuilderTypes";
import type { DB } from "prostgles-server/dist/Prostgles";
import type { FileTableConfig } from "prostgles-server/dist/ProstglesTypes";
import type { InitResult } from "prostgles-server/dist/initProstgles";
import type { SubscriptionHandler } from "prostgles-types";
import { isDefined, pickKeys } from "prostgles-types";
import type { DefaultEventsMap, Server } from "socket.io";
import type { SUser } from "../authConfig/sessionUtils";
import { getDbConnection } from "../connectionUtils/testDBConnection";
import { getRootDir } from "../electronConfig";
import type { Connections, DBS, DatabaseConfigs } from "../index";
import { connectionManager } from "../index";
import { UNIQUE_DB_COLS } from "../tableConfig/tableConfigDatabaseConfig";
import { ForkedPrglProcRunner } from "./ForkedPrglProcRunner/ForkedPrglProcRunner";
import {
  getCompiledTS,
  getTableConfig,
  parseTableConfig,
} from "./connectionManagerUtils";
import { getConnectionHttpServer } from "./getConnectionHttpServer";
import {
  initConnectionManager,
  type CONNECTION_HOT_RELOAD_COLUMNS,
} from "./initConnectionManager";
import { startConnection } from "./startConnection";
export type Unpromise<T extends Promise<any>> =
  T extends Promise<infer U> ? U : never;

export type ConnectionTableConfig = Pick<FileTableConfig, "referencedTables"> &
  Omit<Exclude<DatabaseConfigs["file_table_config"], null>, "referencedTables">;

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

type PRGLInstanceStarted = {
  state: "started";
  isReady: boolean;
  socketPath: string;
  socketUrl: string | undefined;
  app: e.Express;
  io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;
  con: Connections;
  dbConf: DatabaseConfigs;
  prgl: InitResult<void, SUser>;
  connectionInfo: ConnectionDetails;
  methodRunner: ForkedPrglProcRunner | undefined;
  tableConfigRunner: ForkedPrglProcRunner | undefined;
  onMountRunner: ForkedPrglProcRunner | undefined;
  lastRestart: number;
  isSuperUser: boolean | undefined;
};
type PRGLInstanceError = {
  state: "error";
  socketPath: string;
  socketUrl: string | undefined;
  con: Connections;
  error: unknown;
};
type PRGLInstance =
  | {
      state: "initializing";
      initPromise: Promise<PRGLInstanceError | PRGLInstanceStarted>;
      con: Connections;
    }
  | PRGLInstanceStarted
  | PRGLInstanceError;

export class ConnectionManager {
  prglConnections: Map<string, PRGLInstance> = new Map();
  dbsServer: {
    http: httpServer;
    app: e.Express;
    io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;
    port: number;
  };
  // wss?: WebSocket.Server<WebSocket.WebSocket>;
  dbs?: DBS;
  db?: DB;
  connections?: Connections[];
  database_configs?: (DatabaseConfigs & {
    connections: Pick<DBSSchema["connections"], "id">[];
    access_control_user_types: DBSSchema["access_control_user_types"][];
  })[];

  constructor(
    http: httpServer,
    app: Express,
    io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
    port: number,
  ) {
    this.dbsServer = { http, app, io, port };
  }

  connectionHttpServers: Map<
    string,
    ReturnType<typeof createHttpServer> & {
      connectionId: string;
      config: {
        port: number | null;
        socketPath: string;
        web_app_directory: string | null;
        web_app_templated: boolean | null;
      } & HttpAppSecurityOptions;
      type?: "reusing_main_server";
    }
  > = new Map();

  getConnectionHttpServer = getConnectionHttpServer.bind(this);

  conSub?: SubscriptionHandler | undefined;
  dbConfSub?: SubscriptionHandler | undefined;
  dbConfigs: (DBSSchema["database_configs"] & {
    connections: Pick<
      DBSSchema["connections"],
      (typeof CONNECTION_HOT_RELOAD_COLUMNS)[number]
    >[];
    access_control_user_types: DBSSchema["access_control_user_types"][];
  })[] = [];
  init = initConnectionManager.bind(this);

  get connectionPorts() {
    return (
      this.connections
        ?.map((c) => (c.is_state_db ? undefined : c.port || undefined))
        .filter(isDefined) ?? []
    );
  }

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
  onConnectionReload = (
    reloadedConnectionId: string,
    reloadedDatabaseConfigId: number,
  ) => {
    const delay = 1000;
    setTimeout(() => {
      Array.from(this.prglConnections.entries()).forEach(
        ([connectionId, activeConnection]) => {
          if (
            reloadedConnectionId !== connectionId &&
            activeConnection.state === "started" &&
            activeConnection.dbConf.id === reloadedDatabaseConfigId &&
            activeConnection.lastRestart < Date.now() - delay
          ) {
            void activeConnection.prgl.restart();
          }
        },
      );
    }, delay);
  };

  getActiveConnection = (connectionId: string) => {
    const prglCon = this.prglConnections.get(connectionId);
    if (!prglCon) throw "Connection not found";
    if (prglCon.state !== "started") throw "Connection not ready";
    return prglCon;
  };
  getActiveConnectionSilentFail = (connectionId: string) => {
    const prglCon = this.prglConnections.get(connectionId);
    if (prglCon?.state !== "started") return undefined;
    return prglCon;
  };

  setTableConfig = async (
    conId: string,
    {
      id: dbConfId,
      table_config_ts,
      table_config_ts_disabled: disabled,
    }: Pick<
      DBSSchema["database_configs"],
      "id" | "table_config_ts" | "table_config_ts_disabled"
    >,
    connectionInfo: pg.IConnectionParameters<pg.IClient>,
  ) => {
    if (!this.dbs) throw "Dbs not ready";
    const prglCon = this.getActiveConnectionSilentFail(conId);
    if (
      !disabled &&
      prglCon?.tableConfigRunner?.opts.type === "tableConfig" &&
      prglCon.tableConfigRunner.opts.table_config_ts === table_config_ts
    ) {
      return;
    }
    if (prglCon) {
      prglCon.tableConfigRunner?.destroy();
      prglCon.tableConfigRunner = undefined;
    }
    if (disabled) return;
    await this.dbs.database_config_logs.update(
      { id: dbConfId },
      { table_config_logs: null },
    );
    if (table_config_ts) {
      const tableConfig = getTableConfig({
        table_config_ts,
        table_config: null,
      });
      const tableConfigRunner = await ForkedPrglProcRunner.create({
        dbs: this.dbs,
        type: "tableConfig",
        pass_process_env_vars_to_server_side_functions: false,
        table_config_ts,
        dbConfId: dbConfId,
        prglInitOpts: {
          dbConnection: {
            ...connectionInfo,
            application_name: "tableConfig",
          },
          tableConfig,
        },
      });
      const prglCon = this.getActiveConnectionSilentFail(conId);
      if (prglCon) {
        prglCon.tableConfigRunner = tableConfigRunner;
      }
      return tableConfigRunner;
    }
  };

  setOnMount = async (
    databaseConfigId: number,
    {
      id: conId,
      on_mount_ts,
      on_mount_ts_disabled: disabled,
    }: Pick<
      DBSSchema["connections"],
      "id" | "on_mount_ts" | "on_mount_ts_disabled"
    >,
    connectionInfo: pg.IConnectionParameters<pg.IClient>,
  ) => {
    if (!this.dbs) throw "Dbs not ready";
    const prglCon = this.getActiveConnectionSilentFail(conId);
    if (
      !disabled &&
      prglCon?.onMountRunner?.opts.type === "onMount" &&
      prglCon.onMountRunner.opts.on_mount_ts === on_mount_ts
    ) {
      return;
    }
    if (prglCon) {
      prglCon.onMountRunner?.destroy();
      prglCon.onMountRunner = undefined;
    }

    if (disabled) return;
    await this.dbs.database_config_logs.update(
      { id: databaseConfigId },
      { on_mount_logs: null },
    );
    if (on_mount_ts) {
      const compiledCode = getCompiledTS(on_mount_ts);
      const onMountRunner = await ForkedPrglProcRunner.create({
        dbs: this.dbs,
        type: "onMount",
        on_mount_ts,
        on_mount_ts_compiled: compiledCode,
        pass_process_env_vars_to_server_side_functions: false,
        dbConfId: databaseConfigId,
        prglInitOpts: {
          dbConnection: {
            ...connectionInfo,
            application_name: "onMount",
          },
        },
      });
      /** Not awaited to not block opening the connection */
      void onMountRunner.run({
        type: "onMount",
        code: compiledCode,
      });
      const prglCon = this.getActiveConnectionSilentFail(conId);
      if (prglCon) {
        prglCon.onMountRunner = onMountRunner;
      }

      return onMountRunner;
    }
    return;
  };

  syncUsers = async (
    db: DBWithUsers,
    userTypes: DBSSchema["users"]["type"][],
    syncableColumns: (keyof DBSSchema["users"])[],
  ) => {
    if (!db.users || !this.dbs || !syncableColumns.length) return;
    const lastUpdateDb = await db.users.findOne?.(
      {},
      { select: { last_updated: 1 }, orderBy: { last_updated: -1 } },
    );
    const lastUpdateDbs = await this.dbs.users.findOne(
      { type: { $in: userTypes } },
      { select: { last_updated: 1 }, orderBy: { last_updated: -1 } },
    );
    if (
      (lastUpdateDbs?.last_updated && !lastUpdateDb?.last_updated) ||
      (lastUpdateDbs?.last_updated &&
        +(lastUpdateDb?.last_updated || 0) < +lastUpdateDbs.last_updated)
    ) {
      const newUsers = await this.dbs.users.find(
        {
          type: { $in: userTypes },
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
      async (_users) => {
        for (const prglCon of Array.from(this.prglConnections.values())) {
          if (prglCon.state !== "started") continue;
          const db = prglCon.prgl.db as DBWithUsers;
          const dbUsersHandler = db.users;
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
              void this.syncUsers(
                db,
                userTypes as DBSSchema["users"]["type"][],
                syncableColumns,
              );
            }
          }
        }
      },
    );
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
        connIds.map(async (connection_id) => {
          const connectionInstance = this.prglConnections.get(connection_id);
          if (connectionInstance?.state !== "started") return;
          return connectionInstance.prgl.restart();
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

  // setUpWSS() {
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
  // }

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
  ): Required<PRGLInstanceStarted>["prgl"]["db"] | undefined {
    const c = this.prglConnections.get(conId);
    if (c?.state !== "started") return undefined;
    return c.prgl.db;
  }

  async getNewConnectionDb(
    connId: string,
    opts?: pg.IConnectionParameters<pg.IClient>,
  ) {
    return getDbConnection(await this.getConnectionData(connId), opts);
  }

  getConnectionStartedInstance = (conId: string) => {
    const c = this.prglConnections.get(conId);
    if (c?.state !== "started") {
      throw "Connection not found";
    }
    return c;
  };

  disconnect = async (conId: string): Promise<boolean> => {
    await cdbCache.get(conId)?.destroy();
    const conn = this.prglConnections.get(conId);
    let destroyed = false;
    if (conn?.state === "started") {
      conn.methodRunner?.destroy();
      conn.tableConfigRunner?.destroy();
      conn.onMountRunner?.destroy();
      //TODO: fix re-started connection not working. Might need to use ws instead of socket.io
      await conn.prgl.destroy();
      destroyed = true;
    }
    this.prglConnections.delete(conId);
    return destroyed;
  };

  async getConnectionData(connection_id: string) {
    const con = await this.dbs?.connections.findOne({ id: connection_id });
    if (!con) throw "Connection not found";

    return con;
  }

  setFileTable = async (
    con: DBSSchema["connections"],
    newTableConfig: DatabaseConfigs["file_table_config"],
  ) => {
    const activeConnection = this.getActiveConnectionSilentFail(con.id);
    const dbs = this.dbs;
    if (!dbs || !activeConnection) return;
    const { prgl } = activeConnection;
    const { fileTable } = await parseTableConfig({
      type: "new",
      dbs,
      con,
      conMgr: this,
      newTableConfig,
      app: activeConnection.app,
    });
    await prgl.update({ fileTable });
  };

  startConnection = startConnection.bind(this);

  destroy = async () => {
    await this.conSub?.unsubscribe();
    await this.dbConfSub?.unsubscribe();
    await this.userSub?.unsubscribe();
    Array.from(this.prglConnections.values()).forEach((c) => {
      if (c.state !== "started") return;
      c.methodRunner?.destroy();
      c.tableConfigRunner?.destroy();
      c.onMountRunner?.destroy();
      void c.prgl.destroy();
    });
    await Promise.all(
      this.accessControlListeners?.map((l) => l.unsubscribe()) ?? [],
    );
  };
}

export const cdbCache = new Map<
  string,
  {
    db: DB;
    isSuperUser?: boolean;
    hasSuperUser?: boolean;
    opts?: pg.IConnectionParameters<pg.IClient>;
    destroy: () => Promise<void>;
  }
>();
export const getCDB = async (
  connId: string,
  opts?: pg.IConnectionParameters<pg.IClient>,
  isTemporary = false,
) => {
  const connIdWithOpts = !opts ? connId : `${connId}_${JSON.stringify(opts)}`;
  const cached = cdbCache.get(connIdWithOpts);
  if (!cached || cached.db.$pool.ending || isTemporary) {
    const destroy: () => Promise<void> = async () => {
      await db.$pool.end();
      cdbCache.delete(connIdWithOpts);
    };
    const db = await connectionManager.getNewConnectionDb(connId, {
      application_name: "prostgles getCDB",
      ...opts,
    });
    if (isTemporary) return { db, destroy, opts };
    cdbCache.set(connIdWithOpts, {
      db,
      destroy,
      opts,
    });
  }

  return cdbCache.get(connIdWithOpts)!;
};
export const getSuperUserCDB = async (connId: string, dbs: DBS) => {
  const dbInfo = await getCDB(connId);
  if (dbInfo.isSuperUser) return dbInfo;
  const connIdSuperUser = `${connId}_super_user`;
  if (dbInfo.hasSuperUser === false) {
    return dbInfo;
  } else if (dbInfo.hasSuperUser === true) {
    const su = cdbCache.get(connIdSuperUser);
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
    const cached = cdbCache.get(connIdSuperUser);
    if (cached) {
      cached.hasSuperUser = true;
      cached.isSuperUser = true;
    }
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
    cdbCache.set(connIdSuperUser, {
      ...dbSu,
      isSuperUser: true,
      hasSuperUser: true,
    });

    const cached = cdbCache.get(connId);
    if (cached) {
      cached.hasSuperUser = true;
    }
    return cdbCache.get(connIdSuperUser)!;
  }
  const cached = cdbCache.get(connId);
  if (cached) {
    cached.hasSuperUser = false;
    cached.isSuperUser = false;
  }

  return dbInfo;
};
