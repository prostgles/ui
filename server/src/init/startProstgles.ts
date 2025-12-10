import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { ProstglesInitState } from "@common/electronInitTypes";
import type { Express } from "express";
import path from "path";
import type pg from "pg-promise/typescript/pg-subset";
import prostgles from "prostgles-server";
import type { InitResult } from "prostgles-server/dist/initProstgles";
import { getSerialisableError } from "prostgles-types";
import type { Server } from "socket.io";
import type { DBS } from "..";
import { addLog } from "../Logger";
import type { SUser } from "../authConfig/sessionUtils";
import { testDBConnection } from "../connectionUtils/testDBConnection";
import type { DBSConnectionInfo } from "../electronConfig";
import { actualRootDir, getElectronConfig } from "../electronConfig";
import { DBS_CONNECTION_INFO } from "../envVars";
import { publish } from "../publish/publish";
import { publishMethods } from "../publishMethods/publishMethods";
import { tableConfig } from "../tableConfig/tableConfig";
import { tableConfigMigrations } from "../tableConfig/tableConfigMigrations";
import { onProstglesReady } from "./onProstglesReady";
import { startDevHotReloadNotifier } from "./startDevHotReloadNotifier";

type StartArguments = {
  app: Express;
  io: Server;
  con: DBSConnectionInfo | undefined;
  port: number;
  host: string;
};

export let statePrgl: InitResult<DBGeneratedSchema, SUser> | undefined;
export type InitExtra = {
  dbs: DBS;
};
export type ProstglesInitStateWithDBS = ProstglesInitState<InitExtra>;

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
      onReady: async (params, update) => {
        await onProstglesReady(params, update, app, con);
      },
    });

    statePrgl = prgl;

    startDevHotReloadNotifier({ io, port, host });
    return { state: "ok", dbs: prgl.db as DBS };
  } catch (err) {
    return { state: "error", error: err as Error, errorType: "init" };
  }
};
