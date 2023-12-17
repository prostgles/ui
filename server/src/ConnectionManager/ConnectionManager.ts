
import { Express } from "express";
import * as fs from "fs";
import { Server as httpServer } from "http";
import path from "path";
import pg from "pg-promise/typescript/pg-subset";
import prostgles from "prostgles-server";
import { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import { DB, FileTableConfig, ProstglesInitOptions } from "prostgles-server/dist/Prostgles";
import { SubscriptionHandler } from "prostgles-types";
import { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
import { DBSSchema } from "../../../commonTypes/publishUtils";
import { WithOrigin } from "../ConnectionChecker";
import { getDbConnection } from "../connectionUtils/testDBConnection";
import { getRootDir } from "../electronConfig";
import { API_PATH, Connections, DBS, DatabaseConfigs, MEDIA_ROUTE_PREFIX } from "../index";
import { cdbCache } from "../methods/statusMonitor";
import { getRestApiConfig, getTableConfig, parseTableConfig } from "./connectionManagerUtils";
import { startConnection } from "./startConnection";

export type Unpromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never;

export type ConnectionTableConfig = Pick<FileTableConfig, "referencedTables"> & DatabaseConfigs["file_table_config"]; 

export const DB_TRANSACTION_KEY = "dbTransactionProstgles" as const; 
 
export type User = DBSSchema["users"]; 
 
export const getACRules = async (dbs: DBOFullyTyped<DBSchemaGenerated>, user: Pick<User, "type">): Promise<DBSSchema["access_control"][]>  => {
  if(user){
    return await dbs.access_control.find({ $existsJoined: { access_control_user_types: { user_type: user.type } } });
  }    
  return []
} 

type PRGLInstance = {
  socket_path: string;
  con: Connections;
  prgl?: Unpromise<ReturnType<typeof prostgles>>;
  error?: any;
  isReady: boolean;
}

export const getReloadConfigs =async  function (this: ConnectionManager, c: Connections, conf: DatabaseConfigs, dbs: DBS): Promise<Pick<ProstglesInitOptions, "fileTable" | "tableConfig" | "restApi">> {
  const restApi = getRestApiConfig(this, c.id, conf) 
  const tableConfig = getTableConfig(conf);
  const { fileTable } = await parseTableConfig({ type: "saved", dbs, con: c, conMgr: this });
  return {
    restApi,
    tableConfig,
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

  conSub?: SubscriptionHandler | undefined;
  dbConfSub?: SubscriptionHandler | undefined;
  init = async (dbs: DBS, db: DB) => {
    this.dbs = dbs;
    this.db = db;

    await this.conSub?.unsubscribe();
    this.conSub = await this.dbs.connections.subscribe({}, {}, connections => {
      this.saveCertificates(connections);
      this.connections = connections;
    });

    await this.dbConfSub?.unsubscribe();
    this.dbConfSub = await this.dbs.database_configs.subscribe({ }, { select: { "*": 1, connections: { id: 1 } } }, dbConfigs => {
      dbConfigs.forEach(conf => {
        conf.connections.forEach(async (c: { id: string })=> {
          const prglCon = this.prgl_connections[c.id];
          if(prglCon?.prgl){
            const con = await this.getConnectionData(c.id);
            const hotReloadConfig = await getReloadConfigs.bind(this)(con, conf, dbs);
            prglCon.prgl?.update(hotReloadConfig);
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
          const d = await this.dbs?.connections.findOne({ $existsJoined: { database_configs: { id: { $in: dbIds }  } } }, { select: { connIds: { $array_agg: ["id"]  } } })
          onAccessChange(d?.connIds ?? []);
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
    let rootPath = path.resolve(`${getRootDir()}/${MEDIA_ROUTE_PREFIX}`);
    if(conId) return `${rootPath}/${conId}`;
    return rootPath;
  }

  getConnectionDb(conId: string): Required<PRGLInstance>["prgl"]["db"] | undefined {
    return this.prgl_connections[conId]?.prgl?.db;
  }

  async getNewConnectionDb(connId: string, opts?: pg.IConnectionParameters<pg.IClient>) {
    return getDbConnection(await this.getConnectionData(connId), opts);
  }

  getConnection(conId: string): PRGLInstance {
    
    const c = this.prgl_connections[conId];
    if(!c?.prgl) {
      throw "Connection not found";
    }
    return c;
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