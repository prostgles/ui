
import { PRGLIOSocket } from "prostgles-server/dist/DboBuilder";
import { restartProc, Connections, MEDIA_ROUTE_PREFIX, API_PATH, DBS, log } from "./index";
import { WithOrigin } from "./ConnectionChecker";
import { Server }  from "socket.io";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import { CustomTableRules, DBSSchema, MethodClientDef, parseForcedFilter, parseTableRules, TableRules } from "../../commonTypes/publishUtils";
import prostgles from "prostgles-server"; 
import { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import { DB, FileTableConfig } from "prostgles-server/dist/Prostgles";
import path from "path";
import { SubscriptionHandler, omitKeys, pickKeys} from "prostgles-types";
import { getAuth, SUser } from "./authConfig"
import WebSocket from 'ws';
import * as fs from "fs";
import { S3Config } from "prostgles-server/dist/FileManager";
import { Express } from "express";
import { testDBConnection } from "./connectionUtils/testDBConnection";
import { getConnectionDetails } from "./connectionUtils/getConnectionDetails";
import { getRootDir } from "./electronConfig";
import { MethodFullDef } from "prostgles-types";
import ts, { ModuleKind, ModuleResolutionKind, ScriptTarget } from "typescript";
import { JSONBColumnDef } from "prostgles-server/dist/TableConfig";

export type Unpromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never;

export type ConnectionTableConfig = Pick<FileTableConfig, "referencedTables"> & Connections["table_config"]; 

export const DB_TRANSACTION_KEY = "dbTransactionProstgles" as const;

type User = DBSSchema["users"];

export const getACRule = async (dbs: DBOFullyTyped<DBSchemaGenerated>, user: User, connection_id: string): Promise<DBSSchema["access_control"] | undefined>  => {
  if(user){
    return await dbs.access_control.findOne({ connection_id, $existsJoined: { access_control_user_types: { user_type: user.type } } }) //  user_groups: { $contains: [user.type] }
  }
  return undefined
}
export const getACRules = async (dbs: DBOFullyTyped<DBSchemaGenerated>, user: Pick<User, "type">): Promise<DBSSchema["access_control"][]>  => {
  if(user){
    return await dbs.access_control.find({ $existsJoined: { access_control_user_types: { user_type: user.type } } }) //  user_groups: { $contains: [user.type] }
  }
  return []
}

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
  withOrigin: WithOrigin;
  dbs?: DBS;
  db?: DB;
  connections?: Connections[];

  constructor(http: any, app: Express, withOrigin: WithOrigin){
    this.http = http;
    this.app = app;
    this.withOrigin = withOrigin;
    this.setUpWSS();

  }

  conSub?: SubscriptionHandler<Connections> | undefined;
  init = async (dbs: DBS, db: DB) => {
    this.dbs = dbs;
    this.db = db;

    await this.conSub?.unsubscribe();
    this.conSub = await this.dbs.connections.subscribe({}, {}, connections => {
      this.saveCertificates(connections);
      this.connections = connections;
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

  getConnection(conId: string): PRGLInstance | undefined {
    
    return this.prgl_connections[conId];
  }

  getConnections(){
    return this.prgl_connections;
  }

  async disconnect(conId: string): Promise<boolean> {
    if(this.prgl_connections[conId]){
      
      await this.prgl_connections[conId].prgl?.destroy();
      delete this.prgl_connections[conId];
      return true;
    }
    return false;
  }

  reloadFileStorage = async (connId: string) => {
    const c = this.getConnection(connId);
    const con = await this.dbs?.connections.findOne({ id: connId });
    if(!con || !c?.prgl) throw "Connection not found"
    const { fileTable } = await parseTableConfig(this.dbs!, con, this);
    await c.prgl.update({ fileTable });
  }

  getConnectionPath = (con_id: string) => `${API_PATH}/${con_id}`;

  async startConnection(
    con_id: string, 
    dbs: DBOFullyTyped<DBSchemaGenerated>,
    _dbs: DB,
    socket?: PRGLIOSocket, 
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

    const con = await dbs.connections.findOne({ id: con_id }).catch(e => {
      console.error(142,e);
      return undefined
    });
    if(!con) throw "Connection not found";
  
    await testDBConnection(con)
    log("testDBConnection ok")
  
    const socket_path = `${this.getConnectionPath(con_id)}-dashboard/s`;
  
    try {
      if(this.prgl_connections[con.id]){
        // When does the socket path change??!!!
        if(this.prgl_connections[con.id].socket_path !== socket_path ){
  
          restartProc(() => {
            socket?.emit("pls-restart", true)
          })
          
          if(this.prgl_connections[con.id].prgl){
            log("destroying prgl", Object.keys(this.prgl_connections[con.id]));
            this.prgl_connections[con.id].prgl?.destroy()
          }
        } else {
          log("reusing prgl", Object.keys( this.prgl_connections[con.id]));
          if(this.prgl_connections[con.id].error) throw  this.prgl_connections[con.id].error;
          return socket_path;
        }
      }
      log("creating prgl", Object.keys( this.prgl_connections[con.id] || {}))
      this.prgl_connections[con.id] = {
        socket_path, con
      }
  
    } catch(e) {
      console.error(e);
      throw e;
    }
  
    return new Promise(async (resolve, reject) => {
      
  
      const _io = new Server(http, { path: socket_path, maxHttpBufferSize: 1e8, cors: this.withOrigin });
  
  
      try {
        const { fileTable } = await parseTableConfig(dbs, con, this);

        const auth = getAuth(this.app);
        const prgl = await prostgles({ 
          dbConnection: getConnectionDetails(con),
          io: _io,
          auth: {
            ...auth as any,
            getUser: (sid, __, _, cl) => auth.getUser(sid, dbs, _dbs, cl),
            login: (sid, __, _, ip_address) => auth.login?.(sid, dbs, _dbs, ip_address),
            logout: (sid, __, _) => auth.logout?.(sid, dbs, _dbs),
            cacheSession: {
              getSession: (sid) => auth.cacheSession?.getSession(sid, dbs, _dbs)
            }
          },
          // tsGeneratedTypesDir: path.join(ROOT_DIR + '/connection_dbo/' + conId),

          fileTable,
          watchSchema: Boolean(con.db_watch_shema),
          // watchSchema: (a) => {
          //   console.log(a);
          // },
  
          // transactions: true,
          // DEBUG_MODE: true,
          transactions: DB_TRANSACTION_KEY,
          joins: "inferred",
          publish: async ({ user, dbo, tables }) => {
            if(user){
              if(user.type === "admin") {
                return "*";
              }
              
              
              const ac = await getACRule(dbs, user as DBSSchema["users"], con.id);
              
              if(ac?.rule){
                const { dbPermissions } = ac.rule;

                if(dbPermissions.type === "Run SQL" && dbPermissions.allowSQL){
                  return "*" as "*";
  
                } else if(dbPermissions.type === 'All views/tables' && dbPermissions.allowAllTables.length){

                  return Object.keys(dbo).filter(k => dbo[k].find).reduce((a, v) => ({ ...a, [v]: { 
                      select: dbPermissions.allowAllTables.includes("select")? "*" : undefined, 
                      ...(dbo[v].is_view? {} : {
                        update: dbPermissions.allowAllTables.includes("update")? "*" : undefined, 
                        insert: dbPermissions.allowAllTables.includes("insert")? "*" : undefined, 
                        delete: dbPermissions.allowAllTables.includes("delete")? "*" : undefined, 
                      })
                    } 
                  }), {})
                } else if(dbPermissions.type === "Custom" && dbPermissions.customTables){

                  type ParsedTableRules = Record<string, TableRules>;
                  return dbPermissions.customTables
                    .filter((t: any) => dbo[t.tableName])
                    .reduce((a: any, _v) => {
                      const v = _v as CustomTableRules["customTables"][number];
                      const table = tables.find(({ name }) => name === v.tableName) as any;
                      if(!table) return {};

                      const ptr: ParsedTableRules = { 
                        ...a, 
                        [v.tableName]: parseTableRules(omitKeys(v, ["tableName"]), dbo[v.tableName].is_view, table.columns.map((c: any) => c.name), { user: user as DBSSchema["users"] }) 
                      }
                      return ptr;
                   } ,{} as ParsedTableRules)
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
            if(user?.type === "admin"){
              allowedMethods = await dbs.published_methods.find({ connection_id: con.id })
              // const acRules = await dbs.access_control.find({ connection_id: con.id });
              // acRules.map(r => {
              //   r.rule.methods?.map(m => {
              //     allowedMethods.push(m);
              //   })
              // })
            } else {
              const ac = await getACRule(dbs, user as any, con.id);
              if(ac?.rule.methods?.length){
                allowedMethods = await dbs.published_methods.find({ connection_id: con.id, $existsJoined: { access_control_methods: { access_control_id:  ac.id } } })
              }
            }

            allowedMethods.forEach(m => {

              result[m.name] = {
                input: m.arguments.reduce((a, v) => ({ ...a, [v.name]: v }), {}), // v.type === "Lookup"? { lookup: v }: v
                outputTable: m.outputTable ?? undefined,
                run: async (args) => { 

                  const sourceCode = ts.transpile(m.run, { 
                    noEmit: false, 
                    target: ScriptTarget.ES2022,
                    lib: ["ES2022"],
                    module: ModuleKind.CommonJS,
                    moduleResolution: ModuleResolutionKind.NodeJs,
                  }, "input.ts");

                  try {
                    eval(sourceCode);

                    let validatedArgs = undefined;
                    if(m.arguments.length){
                      /**
                       * Validate args
                       */
                      for await(const arg of m.arguments){
                        let argType = omitKeys(arg, ["name"]);
                        if(arg.type === "Lookup" || arg.type === "Lookup[]"){
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
                        } catch(err){
                          throw {
                            message: "Could not validate argument against schema",
                            argument: arg.name
                          }
                        }
                      }
                      validatedArgs = args;
                    }
 
                    //@ts-ignore
                    const methodResult = await exports.run(validatedArgs, { db, dbo, socket, tables, user }); 

                    return methodResult;
                  } catch(err: any){
                    return Promise.reject(err);
                  }
                  
                }
              }
            })


            return result;
          },
          
          publishRawSQL: async ({ user }) => {
            if(user?.type === "admin"){
              return true;
            }
            const ac = await getACRule(dbs, user as any, con.id);
            if(ac?.rule?.dbPermissions.type === "Run SQL" && ac.rule.dbPermissions.allowSQL){
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


const parseTableConfig = async (dbs: DBS, con: Connections, conMgr: ConnectionManager) => {

  let tableConfigOk = false;

  const con_id = con.id;
        
  const tableConfig: typeof con.table_config & Pick<FileTableConfig, "referencedTables"> | null = con.table_config;
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

  const fileTable = (!tableConfig?.fileTable || !tableConfigOk)? undefined : {
    tableName: tableConfig.fileTable,
    expressApp: conMgr.app,
    fileServeRoute: `${MEDIA_ROUTE_PREFIX}/${con_id}`,
    ...(tableConfig.storageType?.type === "local"? {
      localConfig: {
        /* Use path.resolve when using a relative path. Otherwise will get 403 forbidden */
        localFolderPath: conMgr.getFileFolderPath(con_id)
      }
    } : {
      awsS3Config
    }),
    referencedTables: tableConfig.referencedTables,
  }

  return { tableConfig, tableConfigOk, fileTable };
}