import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { getProstglesMcpHub } from "@src/McpHub/ProstglesMcpHub/ProstglesMcpHub";
import { getServiceManager } from "@src/ServiceManager/ServiceManager";
import type { SUser } from "@src/authConfig/sessionUtils";
import type { DBSConnectionInfo } from "@src/electronConfig";
import type e from "express";
import type { DB } from "prostgles-server/dist/Prostgles";
import type { OnReadyCallback } from "prostgles-server/dist/initProstgles";
import { connectionManager, type DBS } from "@src/index";
import BackupManager from "../BackupManager/BackupManager";
import { setLoggerDBS } from "../Logger";
import { setupMCPServerHub } from "../McpHub/AnthropicMcpHub/startMcpHub";
import { initUsers } from "./initUsers";
import { getAuth } from "../authConfig/getAuth";
import {
  subscribeToAuthSetupChanges,
  type AuthSetupDataListener,
} from "../authConfig/subscribeToAuthSetupChanges";
import { setupLLM } from "../serverFunctions/askLLM/setupLLM";
import { insertStateDatabase } from "./insertStateDatabase";
import { getProstglesState } from "./tryStartProstgles";
import { getRestApiConfig } from "@src/ConnectionManager/connectionManagerUtils";
import type { SQLHandler } from "prostgles-types";

let authSetupDataListener: AuthSetupDataListener | undefined;

let backupManager: BackupManager | undefined;
export const initBackupManager = async (
  db: DB,
  dbs: DBS,
  dbsSql: SQLHandler,
) => {
  backupManager ??= await BackupManager.create(
    db,
    dbs,
    dbsSql,
    connectionManager,
  );

  // const workflowChat = await dbs.llm_chats.insert(
  //   {
  //     name: "",
  //     user_id: "userId",
  //     parent_chat_id: 1,
  //     connection_id: "connectionId",
  //     agent_info: {
  //       prompt: [
  //         "You are part of an agentic workflow.",
  //         "Follow the instructions carefully.",
  //         "Use the tools as needed to complete your tasks.",
  //         "Be concise and to the point.",
  //         "When you are ready you must respond with the required output format.",
  //         "",
  //         "Below is your prompt:",
  //         "prompt", // provided as first message
  //       ].join("\n"),
  //       outputSchema: {},
  //       maxIterations,
  //     },
  //     model: "model.id",
  //     max_total_cost_usd: "maxCostUSD",
  //     extra_body: {
  //       max_tokens: 111,
  //       temperature: 1,
  //     },
  //   }, //satisfies DBSSchemaForInsert["llm_chats"],
  //   { returning: "*" },
  // );
  return backupManager;
};

export const getBackupManager = () => backupManager;

export const prostglesOnReady = async (
  params: Parameters<OnReadyCallback<DBGeneratedSchema, SUser>>[0],
  update: Parameters<OnReadyCallback<DBGeneratedSchema, SUser>>[1],
  app: e.Express,
  con: DBSConnectionInfo,
  port: number,
) => {
  await promiseCleanup(async () => {
    const { dbo: db, sql } = params;
    const _db: DB = params.db;

    if (!(await db.global_settings.count())) {
      await db.global_settings.insert({});
    }
    setLoggerDBS(params.dbo);

    await initUsers(db, _db);

    await insertStateDatabase(
      db,
      _db,
      con,
      port,
      getProstglesState().isElectron,
    );
    await setupLLM(db);
    await setupMCPServerHub(db);

    await connectionManager.destroy();
    await connectionManager.init(db, _db);
    getServiceManager(db);

    backupManager ??= await BackupManager.create(
      _db,
      db,
      sql,
      connectionManager,
    );

    const newAuthSetupDataListener = subscribeToAuthSetupChanges(
      db,
      async (authData) => {
        const { stateDatabaseConfig } = authData;
        const connection = await db.connections.findOne({ is_state_db: true });
        const restApi = getRestApiConfig(app, connection!, stateDatabaseConfig);
        app.set("trust proxy", authData.stateDatabaseConfig.trust_proxy);
        const authSetupData = { ...authData, type: "state" as const };
        const auth = await getAuth(app, db, _db, authSetupData);
        void update({
          auth,
          /** TODO: this must be merged with getHotReloadConfigs */
          restApi,
        });
      },
      authSetupDataListener,
    );
    authSetupDataListener = newAuthSetupDataListener;

    const prostglesMCPHub = await getProstglesMcpHub(db);

    return {
      cleanup: async () => {
        await backupManager?.destroy();
        await prostglesMCPHub.destroy();
      },
    };
  });
};

type AsyncCleanup = () => Promise<{ cleanup: () => Promise<void> }>;
const cleanups: ReturnType<AsyncCleanup>[] = [];
let chain = Promise.resolve();
const promiseCleanup = (func: AsyncCleanup) => {
  chain = chain.then(async () => {
    /** Get new values first for better experience */
    cleanups.push(func());

    while (cleanups.length > 1) {
      try {
        const { cleanup } = await cleanups[0]!;
        await cleanup();
      } catch (e) {
        console.error("Error during prostgles onReady cleanup", e);
      } finally {
        void cleanups.shift();
      }
    }
  });
  return chain;
};
