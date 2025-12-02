import type { Express } from "express";
import path from "path";
import type pg from "pg-promise/typescript/pg-subset";
import prostgles from "prostgles-server";
import { tableConfigMigrations } from "../tableConfig/tableConfigMigrations";
import type { DB } from "prostgles-server/dist/Prostgles";
import type { InitResult } from "prostgles-server/dist/initProstgles";
import type { Server } from "socket.io";
import type { DBS } from "..";
import { connMgr } from "..";
import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { ProstglesInitState } from "@common/electronInitTypes";
import BackupManager from "../BackupManager/BackupManager";
import { addLog, setLoggerDBS } from "../Logger";
import { setupMCPServerHub } from "../McpHub/McpHub";
import { initUsers } from "../SecurityManager/initUsers";
import { getAuth } from "../authConfig/getAuth";
import type { SUser } from "../authConfig/sessionUtils";
import {
  subscribeToAuthSetupChanges,
  type AuthSetupDataListener,
} from "../authConfig/subscribeToAuthSetupChanges";
import { testDBConnection } from "../connectionUtils/testDBConnection";
import type { DBSConnectionInfo } from "../electronConfig";
import { actualRootDir, getElectronConfig } from "../electronConfig";
import { DBS_CONNECTION_INFO } from "../envVars";
import { publish } from "../publish/publish";
import { setupLLM } from "../publishMethods/askLLM/setupLLM";
import { publishMethods } from "../publishMethods/publishMethods";
import { tableConfig } from "../tableConfig/tableConfig";
import { insertStateDatabase } from "./insertStateDatabase";
import { startDevHotReloadNotifier } from "./startDevHotReloadNotifier";
import { getProstglesState } from "./tryStartProstgles";
import { getSerialisableError } from "prostgles-types";

type StartArguments = {
  app: Express;
  io: Server;
  con: DBSConnectionInfo | undefined;
  port: number;
  host: string;
};

let backupManager: BackupManager | undefined;
export const initBackupManager = async (db: DB, dbs: DBS) => {
  backupManager ??= await BackupManager.create(db, dbs, connMgr);
  return backupManager;
};

export const getBackupManager = () => backupManager;

export let statePrgl: InitResult<DBGeneratedSchema, SUser> | undefined;
export type InitExtra = {
  dbs: DBS;
};
export type ProstglesInitStateWithDBS = ProstglesInitState<InitExtra>;
let authSetupDataListener: AuthSetupDataListener | undefined;

export const startProstgles = async ({
  app,
  port,
  host,
  io,
  con = DBS_CONNECTION_INFO,
}: StartArguments): Promise<
  Exclude<ProstglesInitStateWithDBS, { state: "loading" }>
> => {
  try {
    if (!con.db_conn && !con.db_user && !con.db_name) {
      const error = `
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

      return { state: "error", error, errorType: "connection" };
    }

    let validatedDbConnection: pg.IConnectionParameters<pg.IClient> | undefined;
    try {
      const tested = await testDBConnection(con, true);
      if (tested.isSSLModeFallBack) {
        console.warn("sslmode=prefer fallback. Connecting through non-ssl");
      }
      validatedDbConnection = tested.connectionInfo;
    } catch (connError) {
      return {
        state: "error",
        error:
          getSerialisableError(connError) ?? "State database connection error",
        errorType: "connection",
      };
    }
    const IS_PROD = process.env.NODE_ENV === "production";

    /** Prevent electron access denied error (cannot edit files in the install directory in electron) */
    const tsGeneratedTypesDir =
      IS_PROD || getElectronConfig()?.isElectron ?
        undefined
      : path.join(actualRootDir + "/../common/");
    const watchSchema = !!tsGeneratedTypesDir;

    const prgl = await prostgles<DBGeneratedSchema, SUser>({
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
        const userId = user.user?.id;
        const sid = user.sid;
        // await securityManager.onSocketConnected({
        //   sid,
        // });

        // if (sid) {
        //   const s = await dbo.sessions.findOne({ id: sid });
        //   if (!s) {
        //     /** Can happen to deleted sessions */
        //     // console.log("onSocketConnect session missing ?!");
        //   } else if (Date.now() > +new Date(+s.expires)) {
        //     console.log("onSocketConnect session expired ?!", s.id, Date.now());
        //   } else {
        //     await dbo.sessions.update(
        //       { id: sid },
        //       {
        //         last_used: new Date(),
        //         is_connected: true,
        //         socket_id: socket.id,
        //       },
        //     );
        //   }
        // }

        if (userId) {
          /** Delete:
           * - deleted workspaces
           * - deleted/closed/detached (null wsp id)  non type=sql windows and links. Must keep detached SQL windows
           */
          const deletedWorkspaces = await dbo.workspaces.delete(
            { deleted: true, user_id: userId },
            { returning: { id: 1 }, returnType: "values" },
          );

          const deletedWindows = await dbo.windows.delete(
            {
              $or: [{ deleted: true }, { closed: true, "type.<>": "sql" }],
            },
            {
              returning: { id: 1 },
              returnType: "values",
            },
          );
          deletedWorkspaces;
          deletedWindows;
        }
      },
      onSocketDisconnect: async (params) => {
        const { dbo, getUser } = params;

        const user = await getUser();
        const sid = user.sid;
        if (sid) {
          await dbo.sessions.update({ id: sid }, { is_connected: false });
        }
      },
      /** Used for debugging */
      // onQuery: (err, ctx) => {
      //   if(err){
      //     console.error(err, ctx?.client?.processID, ctx?.query);
      //   }
      // },
      // DEBUG_MODE: true,
      onLog: (e) => {
        addLog(e, null);
      },
      tableConfig,
      tableConfigMigrations,
      publishRawSQL: (params) => {
        const { user } = params;
        return Boolean(user && user.type === "admin");
      },
      publishMethods,
      publish,
      joins: "inferred",
      onReady: async (params) => {
        const { dbo: db } = params;
        const _db: DB = params.db;

        setLoggerDBS(params.dbo);

        await initUsers(db, _db);

        await insertStateDatabase(db, _db, con, getProstglesState().isElectron);
        await setupLLM(db);
        await setupMCPServerHub(db);

        await connMgr.destroy();
        await connMgr.init(db, _db);

        await backupManager?.destroy();
        backupManager ??= await BackupManager.create(_db, db, connMgr);

        const newAuthSetupDataListener = subscribeToAuthSetupChanges(
          db,
          async (authData) => {
            const auth = await getAuth(app, db, authData);
            void prgl.update({
              auth,
            });
          },
          authSetupDataListener,
        );
        authSetupDataListener = newAuthSetupDataListener;
      },
    });

    statePrgl = prgl;

    startDevHotReloadNotifier({ io, port, host });
    return { state: "ok", dbs: prgl.db as DBS };
  } catch (err) {
    return { state: "error", error: err as Error, errorType: "init" };
  }
};
