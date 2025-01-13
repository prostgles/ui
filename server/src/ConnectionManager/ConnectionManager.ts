import type { Express } from "express";
import type { Server as httpServer } from "http";
import path from "path";
import type pg from "pg-promise/typescript/pg-subset";
import type prostgles from "prostgles-server";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import type { DB } from "prostgles-server/dist/Prostgles";
import type {
  FileTableConfig,
  ProstglesInitOptions,
} from "prostgles-server/dist/ProstglesTypes";
import type { VoidFunction } from "prostgles-server/dist/SchemaWatch/SchemaWatch";
import type { SubscriptionHandler } from "prostgles-types";
import { pickKeys } from "prostgles-types";
import type { DBGeneratedSchema } from "../../../commonTypes/DBGeneratedSchema";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import type { ConnectionChecker, WithOrigin } from "../ConnectionChecker";
import { getDbConnection } from "../connectionUtils/testDBConnection";
import { getRootDir } from "../electronConfig";
import type { Connections, DBS, DatabaseConfigs } from "../index";
import { MEDIA_ROUTE_PREFIX, connMgr } from "../index";
import { UNIQUE_DB_COLS } from "../tableConfig/tableConfig";
import { ForkedPrglProcRunner } from "./ForkedPrglProcRunner";
import {
  getCompiledTS,
  getRestApiConfig,
  getTableConfig,
  parseTableConfig,
} from "./connectionManagerUtils";
import { startConnection } from "./startConnection";
import type { DefaultEventsMap, Server } from "socket.io";
import { saveCertificates } from "./saveCertificates";
import {
  API_PATH_SUFFIXES,
  getConnectionPaths,
} from "../../../commonTypes/utils";
export type Unpromise<T extends Promise<any>> =
  T extends Promise<infer U> ? U : never;

export type ConnectionTableConfig = Pick<FileTableConfig, "referencedTables"> &
  DatabaseConfigs["file_table_config"];

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

type PRGLInstance = {
  socket_path: string;
  io:
    | Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
    | undefined;
  con: Connections;
  dbConf: DatabaseConfigs;
  prgl?: Unpromise<ReturnType<typeof prostgles>>;
  error?: any;
  connectionInfo: pg.IConnectionParameters<pg.IClient>;
  methodRunner: ForkedPrglProcRunner | undefined;
  tableConfigRunner: ForkedPrglProcRunner | undefined;
  onMountRunner: ForkedPrglProcRunner | undefined;
  isReady: boolean;
  lastRestart: number;
  isSuperUser: boolean | undefined;
};

export const getHotReloadConfigs = async (
  conMgr: ConnectionManager,
  c: Connections,
  conf: DatabaseConfigs,
  dbs: DBS,
): Promise<
  Pick<
    ProstglesInitOptions,
    "fileTable" | "tableConfig" | "restApi" | "schemaFilter"
  >
> => {
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
    schemaFilter: c.db_schema_filter || undefined,
  };
};

export class ConnectionManager {
  prglConnections: Record<string, PRGLInstance> = {};
  http: httpServer;
  app: Express;
  // wss?: WebSocket.Server<WebSocket.WebSocket>;
  withOrigin: WithOrigin;
  dbs?: DBS;
  db?: DB;
  connections?: Connections[];
  database_configs?: DatabaseConfigs[];
  connectionChecker: ConnectionChecker;

  constructor(http: any, app: Express, connectionChecker: ConnectionChecker) {
    this.http = http;
    this.app = app;
    this.connectionChecker = connectionChecker;
    this.withOrigin = connectionChecker.withOrigin;

    this.setUpWSS();
  }

  destroy = async () => {
    await this.conSub?.unsubscribe();
    await this.dbConfSub?.unsubscribe();
    await this.userSub?.unsubscribe();
    await this.accessControlListeners?.forEach((l) => l.unsubscribe());
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
  onConnectionReload = async (conId: string, dbConfId: number) => {
    const delay = 1000;
    setTimeout(() => {
      Object.entries(this.prglConnections).forEach(
        async ([_conId, prglCon]) => {
          if (
            conId !== _conId &&
            prglCon.dbConf.id === dbConfId &&
            prglCon.lastRestart < Date.now() - delay
          ) {
            prglCon.prgl?.restart();
          }
        },
      );
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
      const tableConfig = await getTableConfig({
        table_config_ts,
        table_config: null,
      });
      prglCon.tableConfigRunner = await ForkedPrglProcRunner.create({
        dbs: this.dbs,
        type: "tableConfig",
        pass_process_env_vars_to_server_side_functions: false,
        table_config_ts,
        dbConfId: prglCon.dbConf.id!,
        initArgs: {
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
      prglCon.onMountRunner = await ForkedPrglProcRunner.create({
        dbs: this.dbs!,
        type: "onMount",
        on_mount_ts,
        on_mount_ts_compiled: getCompiledTS(on_mount_ts),
        pass_process_env_vars_to_server_side_functions: false,
        dbConfId: prglCon.dbConf.id,
        initArgs: {
          dbConnection: {
            ...prglCon.connectionInfo,
            application_name: "onMount",
          },
        },
      });
      return prglCon.onMountRunner.run({
        type: "onMount",
        code: getCompiledTS(on_mount_ts),
      });
    }
  };

  syncUsers = async (
    db: DBOFullyTyped,
    userTypes: string[],
    syncableColumns: string[],
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
      (lastUpdateDbs?.last_updated && !lastUpdateDb) ||
      (lastUpdateDbs?.last_updated &&
        +lastUpdateDb?.last_updated < +lastUpdateDbs.last_updated)
    ) {
      const newUsers = await this.dbs.users.find(
        {
          "type.$in": userTypes,
          "last_updated.>": lastUpdateDb?.last_updated ?? 0,
        },
        { limit: 1000, orderBy: { last_updated: 1 } },
      );
      if (newUsers.length) {
        await db.users.insert?.(
          newUsers.map((u) => pickKeys(u, syncableColumns as any)),
          { onConflict: "DoUpdate" },
        );
        this.syncUsers(db, userTypes, syncableColumns);
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
        for await (const [connId, prglCon] of Object.entries(
          this.prglConnections,
        )) {
          const db = prglCon.prgl?.db;
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
            const requiredColumns = ["id", "last_updated"];
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
              .filter((c) => !excludedColumns.includes(c));
            if (
              userTypes &&
              requiredColumns.every((c) => syncableColumns.includes(c))
            ) {
              this.syncUsers(db, userTypes, syncableColumns);
            }
          }
        }
      },
    );
  };
  conSub?: SubscriptionHandler | undefined;
  dbConfSub?: SubscriptionHandler | undefined;
  dbConfigs: (Pick<DBSSchema["database_configs"], "id"> & {
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
      (dbConfigs) => {
        this.dbConfigs = dbConfigs;
        dbConfigs.forEach((conf) => {
          conf.connections.forEach(async (c: { id: string }) => {
            const prglCon = this.prglConnections[c.id];
            if (prglCon?.prgl) {
              const con = await this.getConnectionData(c.id);
              const hotReloadConfig = await getHotReloadConfigs(
                this,
                con,
                conf,
                dbs,
              );
              prglCon.prgl.update(hotReloadConfig);
              this.setSyncUserSub();
            }
          });
        });
        this.database_configs = dbConfigs;
      },
    );

    /** Start connections if accessed */
    this.app.use(async (req, res, next) => {
      const { url } = req;
      if (
        this.connections &&
        url.startsWith(API_PATH_SUFFIXES.WS) &&
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

    this.accessControlHotReload();
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
      connIds.forEach((connection_id) => {
        this.prglConnections[connection_id]?.prgl?.restart();
      });
    };
    this.accessControlListeners = [
      (await this.dbs.access_control.subscribe(
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
          ) as number[];
          const d = await this.dbs?.connections.findOne(
            { $existsJoined: { database_configs: { id: { $in: dbIds } } } },
            { select: { connIds: { $array_agg: ["id"] } } },
          );
          onAccessChange(d?.connIds ?? []);
          this.setSyncUserSub();
        },
      )) as SubscriptionHandler,
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

  async getFileFolderPath(conId?: string) {
    const rootPath = path.resolve(`${getRootDir()}/${MEDIA_ROUTE_PREFIX}`);
    if (!conId) return rootPath;
    const conn = await this.connections?.find((c) => c.id === conId);
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
    return c as any;
  }

  getConnections() {
    return this.prglConnections;
  }

  async disconnect(conId: string): Promise<boolean> {
    await cdbCache[conId]?.destroy();
    if (this.prglConnections[conId]) {
      await this.prglConnections[conId]?.prgl?.destroy();
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
    destroy: VoidFunction;
  }
> = {};
export const getCDB = async (
  connId: string,
  opts?: pg.IConnectionParameters<pg.IClient>,
  isTemporary = false,
) => {
  if (!cdbCache[connId] || cdbCache[connId]?.db.$pool.ending || isTemporary) {
    const destroy = async () => {
      await db.$pool.end();
      delete cdbCache[connId];
    };
    const db = await connMgr.getNewConnectionDb(connId, {
      application_name: "getCDB temp",
      ...opts,
    });
    if (isTemporary) return { db, destroy };
    cdbCache[connId] = {
      db,
      destroy,
    };
  }
  const result = cdbCache[connId];
  if (!result) {
    throw `Something went wrong: sql handler missing`;
  }

  return result;
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
    return cdbCache[connIdSuperUser]!;
  }
  cdbCache[connId]!.hasSuperUser = false;
  cdbCache[connId]!.isSuperUser = false;

  return dbInfo;
};
