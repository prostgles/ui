
import { PRGLIOSocket } from "prostgles-server/dist/DboBuilder";
import { testDBConnection, restartProc, getConnectionDetails, Connections, MEDIA_ROUTE_PREFIX, ROOT_DIR, API_PATH } from "./index";
import { Server }  from "socket.io";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import prostgles from "prostgles-server";
import { omitKeys, pickKeys } from "prostgles-server/dist/PubSubManager";
import { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import { PublishedResult } from "prostgles-server/dist/PublishParser";
import { DB, FileTableConfig } from "prostgles-server/dist/Prostgles";
import path from "path";
import { getACFilter} from "./PublishAccessControlParser";
import { isObject } from "prostgles-types";
import { getAuth } from "./authConfig"
import WebSocket from 'ws';
import * as fs from "fs";
import { S3Config } from "prostgles-server/dist/FileManager";
import { Express } from "express"

export type Unpromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never;

export type ConnectionTableConfig = Pick<FileTableConfig, "referencedTables"> & Connections["table_config"]; 

export const DB_TRANSACTION_KEY = "dbTransactionProstgles" as const;

type PRGLInstance = {
  socket_path: string;
  con: Connections;
  prgl?: Unpromise<ReturnType<typeof prostgles>>;
  error?: any;
}

export const PROSTGLES_CERTS_FOLDER = "prostgles_certificates";
export class ConnectionManager {
  prgl_connections: Record<string, PRGLInstance> = {};
  http: any; 
  app: Express;
  wss?: WebSocket.Server<WebSocket.WebSocket>;

  constructor(http: any, app: Express){
    this.http = http;
    this.app = app;
    this.setUpWSS()
  }

  getCertPath(conId: string, type?: "ca" | "cert" | "key"){
    return path.resolve(`${ROOT_DIR}/${PROSTGLES_CERTS_FOLDER}/${conId}` + (type? `/${type}.pem` : ""))
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
    let rootPath = path.resolve(`${ROOT_DIR}/${MEDIA_ROUTE_PREFIX}`);
    if(conId) return `${rootPath}/${conId}`;
    return rootPath;
  }

  getConnectionDb(conId: string): Required<PRGLInstance>["prgl"]["db"] | undefined {
    return this.prgl_connections[conId]?.prgl?.db;
  }

  getConnection(conId: string): PRGLInstance | undefined {
    return this.prgl_connections[conId];
  }

  async disconnect(conId: string): Promise<boolean> {
    if(this.prgl_connections[conId]){
      
      await this.prgl_connections[conId].prgl?.destroy();
      delete this.prgl_connections[conId];
      return true;
    }
    return false;
  }

  async startConnection(
    con_id: string, 
    socket: PRGLIOSocket, 
    dbs: DBOFullyTyped<DBSchemaGenerated>,
    _dbs: DB,
    restartIfExists = false
  ): Promise<string | undefined>{
    const { http } = this;

    if(this.prgl_connections[con_id]){
      if(restartIfExists){
        await this.prgl_connections[con_id].prgl?.destroy();
        delete this.prgl_connections[con_id];
      } else {
        return this.prgl_connections[con_id].socket_path;
      }
    }

    const con = await dbs.connections.findOne({ id: con_id });
    if(!con) throw "Connection not found";
  
    await testDBConnection(con)
    console.log("testDBConnection ok")
  
    const socket_path = `${API_PATH}/${con_id}-dashboard/s`;
  
    try {
      if(this.prgl_connections[con.id]){
        // When does the socket path change??!!!
        if(this.prgl_connections[con.id].socket_path !== socket_path ){
  
          restartProc(() => {
            socket?.emit("pls-restart", true)
          })
          
          if(this.prgl_connections[con.id].prgl){
            console.log("destroying prgl", Object.keys(this.prgl_connections[con.id]));
            this.prgl_connections[con.id].prgl?.destroy()
          }
        } else {
          console.log("reusing prgl", Object.keys( this.prgl_connections[con.id]));
          if(this.prgl_connections[con.id].error) throw  this.prgl_connections[con.id].error;
          return socket_path;
        }
      }
      console.log("creating prgl", Object.keys( this.prgl_connections[con.id] || {}))
      this.prgl_connections[con.id] = {
        socket_path, con
      }
  
    } catch(e) {
      console.error(e);
      throw e;
    }
  
    return new Promise(async (resolve, reject) => {
      
  
      const _io = new Server(http, { path: socket_path, maxHttpBufferSize: 1e8, cors: { origin: "*"  } });
  
      const getRule = async (user: DBSchemaGenerated["users"]["columns"]): Promise<DBSchemaGenerated["access_control"]["columns"] | undefined>  => {
        if(user){
          return dbs.access_control.findOne({ connection_id: con.id, $existsJoined: { access_control_user_types: { user_type: user.type } } }) //  user_groups: { $contains: [user.type] }
        }
        return undefined
      }
  
      try {

        let tableConfigOk = false;
        
        const tableConfig: typeof con.table_config & Pick<FileTableConfig, "referencedTables"> | null = con.table_config;
        console.log("RESTART CONNECTION ON TABLECONFIG CHANGE");
        let awsS3Config: S3Config | undefined;
        if(tableConfig?.storageType?.type === "S3"){
          if(tableConfig.storageType.credential_id){
            const s3Creds = await dbs.credentials.findOne({ id: tableConfig?.storageType.credential_id, type: "s3" });
            if(s3Creds){
              tableConfigOk = true;
              awsS3Config = {
                accessKeyId: s3Creds.key_id,
                secretAccessKey: s3Creds.key_secret,
                bucket: s3Creds.bucket!,
                region: s3Creds.region!
              }
            }
          }
          if(!tableConfigOk){
            console.error("Could not find S3 credentials for fileTable config. File storage will not be set up")
          }
        } else if(tableConfig?.storageType?.type === "local" && tableConfig.fileTable){
          tableConfigOk = true;
        }

        const auth = getAuth(this.app);
        const prgl = await prostgles({ 
          dbConnection: getConnectionDetails(con),
          io: _io,
          auth: {
            ...auth as any,
            getUser: (sid, __, _, cl) => auth.getUser(sid, dbs, _dbs, cl),
            login: (sid, __, _) => auth.login?.(sid, dbs, _dbs),
            logout: (sid, __, _) => auth.logout?.(sid, dbs, _dbs),
            cacheSession: {
              getSession: (sid) => auth.cacheSession?.getSession(sid, dbs, _dbs)
            }
          },
          onSocketConnect: (socket) => {
            // log("onSocketConnect");
            
            return true; 
          }, 
          // tsGeneratedTypesDir: path.join(ROOT_DIR + '/connection_dbo/' + conId),

          fileTable: (!tableConfig?.fileTable || !tableConfigOk)? undefined : {
            tableName: tableConfig.fileTable,
            expressApp: this.app,
            fileServeRoute: `${MEDIA_ROUTE_PREFIX}/${con_id}`,
            ...(tableConfig.storageType?.type === "local"? {
              localConfig: {
                /* Use path.resolve when using a relative path. Otherwise will get 403 forbidden */
                localFolderPath: this.getFileFolderPath(con_id)
              }
            } : {
              awsS3Config
            }),
            referencedTables: tableConfig.referencedTables,
          },
          watchSchema: Boolean(con.db_watch_shema),
  
          // transactions: true,
          // DEBUG_MODE: true,
          // fileTable: { 
          //   tableName:"filetable",
          //   expressApp: app,
          //   localConfig: {
          //     localFolderPath: path.join(__dirname + `../${con.id}/media`)
          //   },
          // },
          transactions: DB_TRANSACTION_KEY,
          joins: "inferred",
          publish: async ({ user, dbo }) => {
            if(user){
              if(user.type === "admin") return "*";
              
              
              const parseTableRules = (rules: any, isView = false): PublishedResult | undefined => {
                const parseMethodFields = (obj: any) => {
                  if(obj === true || obj === "*"){
                    return obj;
                  } else if(isObject(obj)){
                    const forcedFilter = getACFilter(obj)

                    const { fields } = obj;
                    if(isObject(fields)){
                      const vals = Object.values(fields);
                      if(!vals.length){
                        throw "Invalid fields: empty object";
                      }
                      
                      if(
                        !(vals.every(v => v === 1 || v === true) ||
                        vals.every(v => v === 0 || v === false))
                      ){
                      } else {
                        throw "Invalid fields: must have only include or exclude. Cannot have both";
                      }
                    }
                    return { fields, forcedFilter }
                  }
                  return undefined;
                }
  
                if(rules === true || rules === "*"){
                  return true;
                } else if(isObject(rules)){
                  return {
                    select: parseMethodFields(rules.select),
                    ...(!isView? {
                      insert: parseMethodFields(rules.insert),
                      update: parseMethodFields(rules.update),
                      delete: !!rules.delete,
                    } : {})
                  }
                }
              }
              
              const ac = await getRule(user as any);
              console.log(user.type, ac)
              if(ac?.rule){
                const rule = ac.rule;
                if(ac.rule?.type === "Run SQL" && ac.rule.allowSQL){
                  return "*" as "*";
  
                } else if(rule.type === 'All views/tables' && isObject( rule.allowAllTables)){
                  const { select, update, insert, delete: _delete } = rule.allowAllTables;
                  if(select || update || insert || _delete){
                    return Object.keys(dbo).filter(k => dbo[k].find).reduce((a, v) => ({ ...a, [v]: { 
                        select: select? "*" : undefined, 
                        ...(dbo[v].is_view? {} : {
                          update: update? "*" : undefined, 
                          insert: insert? "*" : undefined, 
                          delete: _delete? "*" : undefined, 
                        })
                      } 
                    }), {})
                  }
                } else if(rule.type === "Custom" && rule.customTables){
                  return rule.customTables
                    .filter((t: any) => dbo[t.tableName])
                    .reduce((a: any, v: any) => ({ 
                      ...a, 
                      [v.tableName]: parseTableRules(omitKeys(v, ["tableName"]), dbo[v.tableName].is_view) 
                    }) ,{})
                } else {
                  console.error("Unexpected access control rule: ", rule)
                }
              }
            }
            return undefined
          },
          
          publishRawSQL: async ({ user }) => {
            if(user?.type === "admin"){
              return true;
            }
            const ac = await getRule(user as any);
            if(ac?.rule?.type === "Run SQL" && ac.rule.allowSQL){
              return true;
            }
            return false
          },

          onReady: async (db, _db) => {
            console.log("onReady connection", Object.keys(db));
  

  
            // _db.any("SELECT current_database()").then(console.log)
            resolve(socket_path);
            console.log("dbProj ready", con.db_name)
          }
        });
        this.prgl_connections[con.id] = {
          prgl, 
          // io,
          socket_path,
          con,
        }
  
      } catch(e) {
        reject(e)
        this.prgl_connections[con.id] = {
          error: e, 
          // io,
          socket_path,
          con,
        }
      }
  
    })

  }

}