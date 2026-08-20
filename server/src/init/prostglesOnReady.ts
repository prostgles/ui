import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { getRestApiConfig } from "@src/ConnectionManager/connectionManagerUtils";
import { modifyClientSchema } from "@src/ConnectionManager/modifyClientSchema";
import { getProstglesMcpHub } from "@src/McpHub/ProstglesMcpHub/ProstglesMcpHub";
import { initializeServiceManager } from "@src/ServiceManager/getServiceManager";
import type { SUser } from "@src/authConfig/sessionUtils";
import type { DBSConnectionInfo } from "@src/electronConfig";
import { connectionManager } from "@src/index";
import type e from "express";
import type { DB } from "prostgles-server/dist/Prostgles";
import type { OnReadyCallback } from "prostgles-server/dist/initProstgles";
import BackupManager from "../BackupManager/BackupManager";
import {
  applyStartupSchemaConfig,
  getStartupSchemaConfig,
} from "../ConnectionManager/applyStartupSchemaConfig";
import { setLoggerDBS } from "../Logger";
import { setupMCPServerHub } from "../McpHub/AnthropicMcpHub/startMcpHub";
import { getAuth } from "../authConfig/getAuth";
import {
  subscribeToAuthSetupChanges,
  type AuthSetupDataListener,
} from "../authConfig/subscribeToAuthSetupChanges";
import { setupLLM } from "../serverFunctions/askLLM/setupLLM";
import { initUsers } from "./initUsers";
import { insertStateDatabase } from "./insertStateDatabase";
import { getProstglesState } from "./tryStartProstgles";

let authSetupDataListener: AuthSetupDataListener | undefined;

let backupManager: BackupManager | undefined;
export const getBackupManager = () => {
  if (!backupManager) {
    throw new Error("BackupManager not initialized yet");
  }
  return backupManager;
};

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
    const { serviceManager, isNew: isNewServiceManager } =
      await initializeServiceManager(db);
    const startupSchemaConfig = getStartupSchemaConfig();
    if (
      isNewServiceManager &&
      startupSchemaConfig?.schemaConfig.services
    ) {
      await serviceManager.addServices(
        startupSchemaConfig.schemaConfig.services,
      );
    }
    await applyStartupSchemaConfig({
      dbs: db,
      db: _db,
      startupSchemaConfig,
    });

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
        /** TODO: this must be merged with getHotReloadConfigs AND ProstglesInitOptions should have a getHotReloadConfigs: ({ db, _db }) => HotReloadOpts */
        void update({
          auth,
          restApi,

          modifyClientSchema:
            connection &&
            ((table, tableConfig, userData) =>
              modifyClientSchema({
                connection,
                databaseConfig: stateDatabaseConfig,
                table,
                tableConfig,
                userData,
              })),
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
const cleanups: Awaited<ReturnType<AsyncCleanup>>["cleanup"][] = [];
let chain = Promise.resolve();
const promiseCleanup = (func: AsyncCleanup) => {
  chain = chain.then(async () => {
    const { cleanup } = await func();
    cleanups.push(cleanup);

    while (cleanups.length > 1) {
      const previousCleanup = cleanups.shift()!;

      try {
        await previousCleanup();
      } catch (e) {
        console.error("Error during prostgles onReady cleanup", e);
      }
    }
  });
  return chain;
};
