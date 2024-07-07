
import type { Express } from "express";
import * as fs from "fs";
import type { Server as httpServer } from "http";
import path from "path";
import type pg from "pg-promise/typescript/pg-subset";
import type prostgles from "prostgles-server";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import type { DB } from "prostgles-server/dist/Prostgles";
import type { FileTableConfig, ProstglesInitOptions } from "prostgles-server/dist/ProstglesTypes";
import type { SubscriptionHandler } from "prostgles-types";
import { pickKeys } from "prostgles-types";
import type { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import type { WithOrigin } from "../ConnectionChecker";
import { getDbConnection } from "../connectionUtils/testDBConnection";
import { getRootDir } from "../electronConfig";
import type { Connections, DBS, DatabaseConfigs } from "../index";
import { API_PATH, MEDIA_ROUTE_PREFIX, connMgr } from "../index";
import { ForkedPrglProcRunner } from "./ForkedPrglProcRunner";
import { getCompiledTS, getRestApiConfig, getTableConfig, parseTableConfig } from "./connectionManagerUtils";
import { startConnection } from "./startConnection";
export type Unpromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never;

export type ConnectionTableConfig = Pick<FileTableConfig, "referencedTables"> & DatabaseConfigs["file_table_config"]; 

export const DB_TRANSACTION_KEY = "dbTransactionProstgles" as const; 
 
export type User = DBSSchema["users"]; 
 
export const getACRules = async (dbs: DBOFullyTyped<DBSchemaGenerated>, user: Pick<User, "type">): Promise<DBSSchema["access_control"][]>  => {
  return await dbs.access_control.find({ $existsJoined: { access_control_user_types: { user_type: user.type } } });
} 

type PRGLInstance = {
  socket_path: string;
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
}

export const getReloadConfigs = async function (this: ConnectionManager, c: Connections, conf: DatabaseConfigs, dbs: DBS): Promise<Pick<ProstglesInitOptions, "fileTable" | "tableConfig" | "restApi">> {
  const restApi = getRestApiConfig(this, c.id, conf) 
  const { fileTable } = await parseTableConfig({ type: "saved", dbs, con: c, conMgr: this });
  return {
    restApi,
    fileTable
  }
}


export const PROSTGLES_CERTS_FOLDER = "prostgles_certificates";

export class ConnectionManager {
  prgl_connections: Record<string, PRGLInstance> = {};
  http: httpServer; 
  app: Express;
  // wss?: WebSocket.Server<WebSocket.WebSocket>;
  withOrigin: WithOrigin;
  dbs?: DBS;
  db?: DB;
  connections?: Connections[];
  database_configs?: DatabaseConfigs[];

  constructor(http: any, app: Express, withOrigin: WithOrigin){
    this.http = http;
    this.app = app;
    this.withOrigin = withOrigin;
    this.setUpWSS();
  }

  getConnectionsWithPublicAccess = () => {
    return this.dbConfigs.filter(c => c.access_control_user_types.some(u => u.user_type === "public"));
  }

  /** 
   * If a connection was reloaded due to permissions change (revoke/grant) then 
   * restart all other related connections that did not get this event 
   * 
  */
  onConnectionReload = async (conId: string, dbConfId: number) => {
    const delay = 1000;
    setTimeout(() => {
      Object.entries(this.prgl_connections).forEach(async ([_conId, prglCon]) => {
        if(conId !== _conId && prglCon.dbConf.id === dbConfId && prglCon.lastRestart < (Date.now() - delay)){
          prglCon.prgl?.restart();
        }
      });
    }, delay);
  }

  setTableConfig = async (conId: string, table_config_ts: string | undefined | null, disabled: boolean | null) => {
    const prglCon = this.prgl_connections[conId];
    if(!prglCon) throw "Connection not found";
    if(!this.dbs) throw "Dbs not ready";
    if(
      prglCon.tableConfigRunner?.opts.type === "tableConfig" && 
      prglCon.tableConfigRunner.opts.table_config_ts === table_config_ts &&
      !disabled
    ) return;
    prglCon.tableConfigRunner?.destroy();
    prglCon.tableConfigRunner = undefined;
    if(disabled) return;
    await this.dbs.database_config_logs.update({ id: prglCon.dbConf.id }, { table_config_logs: null });
    if(table_config_ts){
      const tableConfig = await getTableConfig({ table_config_ts, table_config: null })
      prglCon.tableConfigRunner = await ForkedPrglProcRunner.create({ 
        dbs: this.dbs, 
        type: "tableConfig", 
        table_config_ts,
        dbConfId: prglCon.dbConf.id!, 
        initArgs: { 
          dbConnection: prglCon.connectionInfo,
          tableConfig 
        },
      });  
      return 1;
    }
  }

  setOnMount = async (conId: string, on_mount_ts: string | undefined | null, disabled: boolean | null) => {
    const prglCon = this.prgl_connections[conId];
    if(!prglCon) throw "Connection not found";
    if(!this.dbs) throw "Dbs not ready";
    if(
      prglCon.onMountRunner?.opts.type === "onMount" && 
      prglCon.onMountRunner.opts.on_mount_ts === on_mount_ts
    ) {
      return;
    }
    prglCon.onMountRunner?.destroy();
    prglCon.onMountRunner = undefined;

    if(disabled) return;
    await this.dbs.database_config_logs.update({ id: prglCon.dbConf.id }, { on_mount_logs: null });
    if(on_mount_ts){
      prglCon.onMountRunner = await ForkedPrglProcRunner.create({ 
        dbs: this.dbs!, 
        type: "onMount",
        on_mount_ts,
        on_mount_ts_compiled: getCompiledTS(on_mount_ts),
        dbConfId: prglCon.dbConf.id, 
        initArgs: { dbConnection: prglCon.connectionInfo },
      });
      return prglCon.onMountRunner.run({ 
        type: "onMount",
        code: getCompiledTS(on_mount_ts),
      });
    }
  }

  syncUsers = async (db: DBOFullyTyped, userTypes: string[], syncableColumns: string[]) => {
    if(!db.users || !this.dbs || !syncableColumns.length) return;
    const lastUpdateDb = await db.users.findOne?.({ }, { select: { last_updated: 1 }, orderBy: { last_updated: -1 } });
    const lastUpdateDbs = await this.dbs.users.findOne({ "type.$in": userTypes }, { select: { last_updated: 1 }, orderBy: { last_updated: -1 } });
    if(lastUpdateDbs?.last_updated && !lastUpdateDb || lastUpdateDbs?.last_updated && +(lastUpdateDb?.last_updated) < +(lastUpdateDbs.last_updated)){
      const newUsers = await this.dbs.users.find({ "type.$in": userTypes, "last_updated.>": lastUpdateDb?.last_updated ?? 0 }, { limit: 1000, orderBy: { last_updated: 1 } });
      if(newUsers.length){
        await db.users.insert?.(newUsers.map(u => pickKeys(u, syncableColumns as any)), { onConflict: "DoUpdate" });
        this.syncUsers(db, userTypes, syncableColumns);
      }
    }
  }

  userSub?: SubscriptionHandler | undefined;
  setSyncUserSub = async ( ) => {
    await this.userSub?.unsubscribe();
    this.userSub = await this.dbs?.users.subscribe({}, { throttle: 1e3 }, async (users) => {
      for await (const [connId, prglCon] of Object.entries(this.prgl_connections)){
        const db = prglCon.prgl?.db;
        const dbUsersHandler = db?.users;
        const dbConf = await this.dbs?.database_configs.findOne({ id: prglCon.dbConf.id });
        if(dbUsersHandler && dbConf?.sync_users){
          const userTypes = await this.dbs?.access_control_user_types.find(
            { $existsJoined: { "**.connections": { id: prglCon.con.id } } },
            { 
              select: { user_type: 1 }, 
              returnType: "values" 
            }
          );
          const dbCols = await dbUsersHandler.getColumns?.()
          const dbsCols = await this.dbs?.users.getColumns?.()
          if(!dbCols || !dbsCols) return;
          const requiredColumns = ["id", "last_updated"];
          const excludedColumns = ["password"];
          const syncableColumns = dbsCols
            .filter(c => 
              dbCols.some(dc => dc.insert && dc.name === c.name && dc.udt_name === c.udt_name)
            )
            .map(c => c.name)
            .filter(c => !excludedColumns.includes(c));
          if(userTypes && requiredColumns.every(c => syncableColumns.includes(c))){
            this.syncUsers(db, userTypes, syncableColumns);
          }
        }
      }
    });
  }
  conSub?: SubscriptionHandler | undefined;
  dbConfSub?: SubscriptionHandler | undefined;
  dbConfigs: (Pick<DBSSchema["database_configs"], "id"> & {
    connections: { id: string }[];
    access_control_user_types: { user_type: string; access_control_id: number }[];
  })[] = [];
  init = async (dbs: DBS, db: DB) => {
    this.dbs = dbs;
    this.db = db;

    await this.conSub?.unsubscribe();
    this.conSub = await this.dbs.connections.subscribe({}, {}, connections => {
      this.saveCertificates(connections);
      this.connections = connections;
    });

    await this.dbConfSub?.unsubscribe();
    this.dbConfSub = await this.dbs.database_configs.subscribe({ }, { select: { "*": 1, connections: { id: 1 }, access_control_user_types: "*",  } }, dbConfigs => {
      this.dbConfigs = dbConfigs;
      dbConfigs.forEach(conf => {
        conf.connections.forEach(async (c: { id: string })=> { 
          const prglCon = this.prgl_connections[c.id];
          if(prglCon?.prgl){
            const con = await this.getConnectionData(c.id);
            const hotReloadConfig = await getReloadConfigs.bind(this)(con, conf, dbs);
            prglCon.prgl.update(hotReloadConfig);
            this.setSyncUserSub();
          }
        })
      })
      this.database_configs = dbConfigs;
    });

    /** Start connections if accessed */
    this.app.use(async (req, res, next) => {
      const { url } = req;
      if(this.connections && url.startsWith(API_PATH) && !Object.keys(this.prgl_connections).some(connId => url.includes(connId))){
        const offlineConnection = this.connections.find(c => url.includes(c.id));
        if(offlineConnection && this.dbs && this.db){
          await this.startConnection(offlineConnection.id, this.dbs, this.db);
        }
      } 
      next();
    });
  
    this.accessControlHotReload();
  }
  
  accessControlSkippedFirst = false;
  accessControlListeners?: SubscriptionHandler[];
  accessControlHotReload = async () => { 
    if(!this.dbs || this.accessControlListeners?.length) return; 
    const onAccessChange = (connIds: string[]) => {
      if(!this.accessControlSkippedFirst){
        this.accessControlSkippedFirst = true;
        return;
      }
      console.log("onAccessChange");
      connIds.forEach(connection_id => {
        this.prgl_connections[connection_id]?.prgl?.restart();
      });
    }
    this.accessControlListeners = [
      await this.dbs.access_control.subscribe(
        {}, 
        { 
          select: { database_id: 1, access_control_user_types: { access_control_id: 1 }, access_control_methods: { access_control_id: 1 }  } ,
          throttle: 1000,
          throttleOpts: {
            skipFirst: true
          } 
        }, 
        async (connections) => {
          const dbIds = Array.from(new Set(connections.map(c => c.database_id)));
          const d = await this.dbs?.connections.findOne(
            { $existsJoined: { database_configs: { id: { $in: dbIds }  } } }, 
            { select: { connIds: { $array_agg: ["id"]  } } }
          );
          onAccessChange(d?.connIds ?? []);
          this.setSyncUserSub();
        }) as SubscriptionHandler
    ]
  } 
 
  getCertPath(conId: string, type?: "ca" | "cert" | "key"){
    return path.resolve(`${getRootDir()}/${PROSTGLES_CERTS_FOLDER}/${conId}` + (type? `/${type}.pem` : ""))
  }

  saveCertificates(connections: Connections[]){
    connections.forEach(c => {
      const hasCerts = c.ssl_certificate || c.ssl_client_certificate_key || c.ssl_client_certificate;
      if(hasCerts){
        const folder = this.getCertPath(c.id);
        try {
          fs.rmSync(folder, { recursive: true });
          fs.mkdirSync(folder, { recursive: true, mode: 0o600 });
          const utfOpts: fs.WriteFileOptions =  {encoding: "utf-8", mode: 0o600 } //
          if(c.ssl_certificate){ 
            fs.writeFileSync(this.getCertPath(c.id, "ca"), c.ssl_certificate, utfOpts);
          }
          if(c.ssl_client_certificate) {
            fs.writeFileSync(this.getCertPath(c.id, "cert"), c.ssl_client_certificate, utfOpts);
          }
          if(c.ssl_client_certificate_key) {
            fs.writeFileSync(this.getCertPath(c.id, "key"), c.ssl_client_certificate_key, utfOpts);
          }
        } catch(err){
          console.error("Failed writing ssl certificates:", err)
        }
      }
    })
  }

  setUpWSS(){ 
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

  getFileFolderPath(conId?: string){
    const rootPath = path.resolve(`${getRootDir()}/${MEDIA_ROUTE_PREFIX}`);
    if(conId) return `${rootPath}/${conId}`;
    return rootPath;
  }

  getConnectionDb(conId: string): Required<PRGLInstance>["prgl"]["db"] | undefined {
    return this.prgl_connections[conId]?.prgl?.db;
  }

  async getNewConnectionDb(connId: string, opts?: pg.IConnectionParameters<pg.IClient>) {
    return getDbConnection(await this.getConnectionData(connId), opts);
  }

  getConnection(conId: string): PRGLInstance & Pick<Required<PRGLInstance>, "prgl"> {
    
    const c = this.prgl_connections[conId];
    if(!c?.prgl) {
      throw "Connection not found";
    }
    return c as any;
  }

  getConnections(){
    return this.prgl_connections;
  }
 
  async disconnect(conId: string): Promise<boolean> {
    await cdbCache[conId]?.$pool.end();
    if(this.prgl_connections[conId]){
      
      await this.prgl_connections[conId]?.prgl?.destroy();
      delete this.prgl_connections[conId];
      return true;
    }
    return false;
  }

  async getConnectionData(connection_id: string){

    const con = await this.dbs?.connections.findOne({ id: connection_id });
    if(!con) throw "Connection not found";

    return con;
  } 

  getConnectionPath = (con_id: string) => `${API_PATH}/${con_id}`;

  setFileTable = async (con: DBSSchema["connections"], newTableConfig: DatabaseConfigs["file_table_config"]) => {
    const prgl = this.prgl_connections[con.id]?.prgl;
    const dbs = this.dbs;
    if(!dbs || !prgl) return;

    const { fileTable } = await parseTableConfig({ type: "new", dbs, con, conMgr: this, newTableConfig });
    await prgl.update({ fileTable });
  }

  startConnection = startConnection.bind(this);

}


export const cdbCache: Record<string, DB> = {};
export const getCDB = async (connId: string, opts?: pg.IConnectionParameters<pg.IClient>, isTemporary = false) => {
  if(!cdbCache[connId] || cdbCache[connId]?.$pool.ending || isTemporary){
    const db = await connMgr.getNewConnectionDb(connId, { application_name: "prostgles-status-monitor", ...opts });
    if(isTemporary) return db;
    cdbCache[connId] = db;
  }
  const result = cdbCache[connId];
  if(!result){
    throw `Something went wrong: sql handler missing`;
  }

  return result;
} 