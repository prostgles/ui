import type { Express } from "express";
import path from "path";
import type pg from "pg-promise/typescript/pg-subset";
import prostgles from "prostgles-server";
import { getErrorAsObject } from "prostgles-server/dist/DboBuilder/dboBuilderUtils";
import type { DB } from "prostgles-server/dist/Prostgles";
import { pickKeys } from "prostgles-server/dist/PubSubManager/PubSubManager";
import type { InitResult } from "prostgles-server/dist/initProstgles";
import type { Server } from "socket.io";
import type { DBS } from ".";
import { connMgr, connectionChecker } from ".";
import type { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import type { ProstglesInitState } from "../../commonTypes/electronInit";
import BackupManager from "./BackupManager/BackupManager";
import { addLog, setLoggerDBS } from "./Logger";
import { getAuth } from "./authConfig/authConfig";
import { testDBConnection } from "./connectionUtils/testDBConnection";
import type { DBSConnectionInfo } from "./electronConfig";
import { actualRootDir, getElectronConfig } from "./electronConfig";
import { DBS_CONNECTION_INFO } from "./envVars";
import { insertStateDatabase } from "./insertStateDatabase";
import { publish } from "./publish";
import { publishMethods } from "./publishMethods/publishMethods";
import { setDBSRoutesForElectron } from "./setDBSRoutesForElectron";
import { startDevHotReloadNotifier } from "./startDevHotReloadNotifier";
import { tableConfig } from "./tableConfig";
import { insertDefaultPrompts } from "./publishMethods/askLLM/askLLM";

type StartArguments = {
  app: Express; 
  io: Server; 
  con: DBSConnectionInfo | undefined;
  port: number;
  host: string;
}

let bkpManager: BackupManager | undefined;
export const initBackupManager = async (db: DB, dbs: DBS) => {
  bkpManager ??= await BackupManager.create(db, dbs, connMgr);
  return bkpManager;
}

export let statePrgl: InitResult | undefined;

type ProstglesStartupState = 
| { ok: true; init?: undefined; conn?: undefined } 
| { ok?: undefined; init?: any; conn?: any; };

export const startProstgles = async ({ app, port, host, io, con = DBS_CONNECTION_INFO}: StartArguments): Promise<ProstglesStartupState> => {
  try {
    if(!con.db_conn && !con.db_user && !con.db_name) {
      
      const conn = `
        Make sure .env file contains superuser postgres credentials:
          POSTGRES_URL
          or
          POSTGRES_DB
          POSTGRES_USER

        Example:
          POSTGRES_USER=myusername 
          POSTGRES_PASSWORD=exampleText 
          POSTGRES_DB=mydatabase  
          POSTGRES_HOST=exampleText 
          POSTGRES_PORT=exampleText 

        To create a superuser and database on linux:
          sudo -su postgres createuser -P --superuser myusername
          sudo -su postgres createdb mydatabase -O myusername

      `;

      return { conn };
    }

    let validatedDbConnection: pg.IConnectionParameters<pg.IClient> | undefined;
    try {
      const tested = await testDBConnection(con, true)
      if(tested.isSSLModeFallBack){
        console.warn("sslmode=prefer fallback. Connecting through non-ssl")
      }
      validatedDbConnection = tested.connectionInfo;
    } catch(connError){
      return { conn: getErrorAsObject(connError) };
    }
    const IS_PROD = process.env.NODE_ENV === "production";


    /** Prevent electron access denied error (cannot edit files in the install directory in electron) */
    const tsGeneratedTypesDir =  (IS_PROD || getElectronConfig()?.isElectron)? undefined : path.join(actualRootDir + "/../commonTypes/");
    const watchSchema = !!tsGeneratedTypesDir;
    const auth = getAuth(app);
    //@ts-ignore
    const prgl = await prostgles<DBSchemaGenerated>({
      dbConnection: {
        ...validatedDbConnection,
        connectionTimeoutMillis: 10 * 1000,
      },
      sqlFilePath: path.join(actualRootDir + "/src/init.sql"),
      io,
      tsGeneratedTypesDir,
      watchSchema,
      watchSchemaType: "DDL_trigger",
      transactions: true,
      onSocketConnect: async ({ socket, dbo, getUser }) => {
          
        const user = await getUser();

        if(user?.user?.type === "admin"){
          await insertDefaultPrompts(dbo, user.user.id);
        }
        const userId = user?.user?.id;
        const sid = user?.sid;   

        await connectionChecker.onSocketConnected({ sid, getUser: getUser as any });

        if(sid){
          const s = await dbo.sessions.findOne({ id: sid });
          if(!s){
            /** Can happen to deleted sessions */
            // console.log("onSocketConnect session missing ?!");
          } else if(Date.now() > +(new Date(+s.expires))){
            console.log("onSocketConnect session expired ?!", s.id, Date.now());
          } else {
            await dbo.sessions.update({ id: sid }, { last_used: new Date(), is_connected: true, socket_id: socket.id });
          }
        }
 
        if(userId){
          /** Delete:
           * - deleted workspaces 
           * - deleted/closed/detached (null wsp id)  non type=sql windows and links. Must keep detached SQL windows
          */
          const deletedWorkspaces =  await dbo.workspaces.delete({ deleted: true, user_id: userId }, { returning: { id: 1 }, returnType: "values" });
          
          const deletedWindows = await dbo.windows.delete(
            { 
              $or: [
                { deleted: true }, 
                { closed: true, "type.<>": "sql" },
              ] 
            }, 
            { 
              returning: { id: 1 },
              returnType: "values"
            }
          );
          deletedWorkspaces;deletedWindows;
        }
      },
      onSocketDisconnect: async (params) => {
        const { dbo, getUser } = params;

        //@ts-ignore
        const user = await getUser();
        const sid = user?.sid;
        if(sid){
          await dbo.sessions.update({ id: sid }, { is_connected: false })
        }
      },
      /** Used for debugging */
      // onQuery: (err, ctx) => {
      //   if(err){
      //     console.error(err, ctx?.client?.processID, ctx?.query);
      //   }
      // },
      onLog: async (e) => {
        addLog(e, null);
      },
      tableConfig,
      tableConfigMigrations: { 
        silentFail: false,
        version: 3,
        onMigrate: async ( ) => { 
        }
      },
      publishRawSQL: async (params) => {
        const { user } = params
        return Boolean(user && user.type === "admin")
      },
      auth: auth as any,
      publishMethods,
      publish: params => publish(params) as any,
      joins: "inferred",
      onReady: async (params) => {
        const { dbo: db } = params;
        const _db: DB = params.db;
        
        setLoggerDBS(params.dbo);

        /* Update stale data */
        await connectionChecker.init(db, _db); 
                  
        await insertStateDatabase(db, _db, con);

        await connMgr.init(db, _db);

        bkpManager ??= await BackupManager.create(_db, db, connMgr);
      }, 
    });

    statePrgl = prgl;
    startDevHotReloadNotifier({ io, port, host });
    return { ok: true }
  } catch(err){
    return { init: err };
  }
}

const _initState: Pick<ProstglesInitState, "initError" | "connectionError" | "electronIssue"> & {
  ok: boolean;
  loading: boolean;
  loaded: boolean;
  httpListening?: {
    port: number;
  }
} = {
  ok: false,
  loading: false,
  loaded: false,
}

let connHistory: string[] = [];
export const tryStartProstgles = async ({ app, io, port, host, con = DBS_CONNECTION_INFO}: StartArguments): Promise<Pick<ProstglesInitState, "ok" | "initError" | "connectionError">> => {

  const maxTries = 2;
  return new Promise((resolve, reject) => {

    let tries = 0;

    _initState.connectionError = null;
    _initState.loading = true;
    const interval = setInterval(async () => {
      
      const connHistoryItem = JSON.stringify(con);
      if(connHistory.includes(connHistoryItem)){
        console.error("DUPLICATE UNFINISHED CONNECTION");
        return; 
      }
      connHistory.push(connHistoryItem); 
      try {
        const status = await startProstgles({ app, io, con, port, host });
        _initState.connectionError = status.conn;
        _initState.initError = status.init;
        
        const databaseDoesNotExist = status.conn?.code === "3D000";
        if(status.ok || databaseDoesNotExist){
          tries = maxTries + 1;
        } else {
          tries++;
        }
      } catch(err){
        console.error("startProstgles fail: ", err)
        _initState.initError = err;
        tries++;
      }
      connHistory = connHistory.filter(v => v !== connHistoryItem);
      
      const error = _initState.connectionError || _initState.initError;
      _initState.ok = !error;
      const result = pickKeys(_initState, ["ok", "connectionError", "initError"]);
  
      if(tries > maxTries){
        clearInterval(interval);
        setDBSRoutesForElectron(app, io, port, host);
        _initState.loading = false;
        _initState.loaded = true; 

        if(!_initState.ok){
          reject(result)
        } else {
          resolve(result);
        }
        return
      }
  
    }, 10000);
  
  }); 
}

export const getInitState = (): typeof _initState & ProstglesInitState  => {
  const eConfig = getElectronConfig();
  return {
    isElectron: !!eConfig?.isElectron,
    electronCredsProvided: !!eConfig?.hasCredentials(),
    ..._initState,
    canDumpAndRestore: bkpManager?.installedPrograms,
  }
};