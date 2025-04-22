import type { Express } from "express";
import path from "path";
import type pg from "pg-promise/typescript/pg-subset";
import prostgles from "prostgles-server";
import { getErrorAsObject } from "prostgles-server/dist/DboBuilder/dboBuilderUtils";
import type { DB } from "prostgles-server/dist/Prostgles";
import type { InitResult } from "prostgles-server/dist/initProstgles";
import type { Server } from "socket.io";
import type { DBS } from "..";
import { connMgr, securityManager } from "..";
import type { DBGeneratedSchema } from "../../../commonTypes/DBGeneratedSchema";
import BackupManager from "../BackupManager/BackupManager";
import { addLog, setLoggerDBS } from "../Logger";
import { setupMCPServerHub } from "../McpHub/McpHub";
import { getAuth } from "../authConfig/getAuth";
import { setAuthReloader } from "../authConfig/setAuthReloader";
import { testDBConnection } from "../connectionUtils/testDBConnection";
import type { DBSConnectionInfo } from "../electronConfig";
import { actualRootDir, getElectronConfig } from "../electronConfig";
import { DBS_CONNECTION_INFO } from "../envVars";
import { insertStateDatabase } from "../insertStateDatabase";
import { publish } from "../publish/publish";
import { setupLLM } from "../publishMethods/askLLM/setupLLM";
import { publishMethods } from "../publishMethods/publishMethods";
import { startDevHotReloadNotifier } from "../startDevHotReloadNotifier";
import { tableConfig } from "../tableConfig/tableConfig";
import { getInitState } from "./tryStartProstgles";

type StartArguments = {
  app: Express;
  io: Server;
  con: DBSConnectionInfo | undefined;
  port: number;
  host: string;
};

let bkpManager: BackupManager | undefined;
export const initBackupManager = async (db: DB, dbs: DBS) => {
  bkpManager ??= await BackupManager.create(db, dbs, connMgr);
  return bkpManager;
};

export const getBackupManager = () => bkpManager;

export let statePrgl: InitResult | undefined;

export type ProstglesStartupState =
  | { ok: true; initError?: undefined; connectionError?: undefined; dbs: DBS }
  | { ok?: undefined; initError: any; connectionError: any };

export const startProstgles = async ({
  app,
  port,
  host,
  io,
  con = DBS_CONNECTION_INFO,
}: StartArguments): Promise<ProstglesStartupState> => {
  try {
    if (!con.db_conn && !con.db_user && !con.db_name) {
      const connectionError = `
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

      return { connectionError, initError: undefined };
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
        connectionError: getErrorAsObject(connError),
        initError: undefined,
      };
    }
    const IS_PROD = process.env.NODE_ENV === "production";

    /** Prevent electron access denied error (cannot edit files in the install directory in electron) */
    const tsGeneratedTypesDir =
      IS_PROD || getElectronConfig()?.isElectron ?
        undefined
      : path.join(actualRootDir + "/../commonTypes/");
    const watchSchema = !!tsGeneratedTypesDir;
    const auth = await getAuth(app, undefined);

    const prgl = await prostgles<DBGeneratedSchema>({
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

        await securityManager.onSocketConnected({
          sid,
        });

        if (sid) {
          const s = await dbo.sessions.findOne({ id: sid });
          if (!s) {
            /** Can happen to deleted sessions */
            // console.log("onSocketConnect session missing ?!");
          } else if (Date.now() > +new Date(+s.expires)) {
            console.log("onSocketConnect session expired ?!", s.id, Date.now());
          } else {
            await dbo.sessions.update(
              { id: sid },
              {
                last_used: new Date(),
                is_connected: true,
                socket_id: socket.id,
              },
            );
          }
        }

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
      onLog: async (e) => {
        addLog(e, null);
      },
      tableConfig,
      tableConfigMigrations: {
        silentFail: false,
        version: 5,
        onMigrate: async ({ db, oldVersion }) => {
          console.warn("Migrating from version: ", oldVersion);
          if (oldVersion === 3) {
            await db.any(` 
              UPDATE login_attempts 
                SET ip_address_remote = COALESCE(ip_address_remote, ''),
                  user_agent = COALESCE(user_agent, ''),
                  x_real_ip = COALESCE(x_real_ip, '')
              WHERE ip_address_remote IS NULL 
              OR user_agent IS NULL 
              OR x_real_ip IS NULL
            `);
          } else if (oldVersion === 4) {
            await db.any(` 
              UPDATE llm_messages
              SET message = jsonb_build_array(jsonb_build_object('type', 'text', 'text', message)) 
              WHERE message IS NOT NULL
            `);
          }
        },
      },
      publishRawSQL: async (params) => {
        const { user } = params;
        return Boolean(user && user.type === "admin");
      },
      auth: auth as any,
      publishMethods,
      publish: (params) => publish(params) as any,
      joins: "inferred",
      onReady: async (params) => {
        const { dbo: db } = params;
        const _db: DB = params.db;

        setLoggerDBS(params.dbo);

        /* Update stale data */
        await securityManager.destroy();
        await securityManager.init(db, _db);

        await insertStateDatabase(db, _db, con, getInitState().isElectron);
        await setupLLM(db);
        await setupMCPServerHub(db);

        await connMgr.destroy();
        await connMgr.init(db, _db);

        await bkpManager?.destroy();
        bkpManager ??= await BackupManager.create(_db, db, connMgr);

        setAuthReloader(app, db, prgl);
      },
    });

    statePrgl = prgl;

    startDevHotReloadNotifier({ io, port, host });
    return { ok: true, dbs: prgl.db as DBS };
  } catch (err) {
    return { initError: err, connectionError: undefined };
  }
};
