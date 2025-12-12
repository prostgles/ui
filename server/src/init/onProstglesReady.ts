import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { getServiceManager } from "@src/ServiceManager/ServiceManager";
import type { SUser } from "@src/authConfig/sessionUtils";
import type { DBSConnectionInfo } from "@src/electronConfig";
import type e from "express";
import type { DB } from "prostgles-server/dist/Prostgles";
import type { OnReadyCallback } from "prostgles-server/dist/initProstgles";
import { connMgr, type DBS } from "..";
import BackupManager from "../BackupManager/BackupManager";
import { setLoggerDBS } from "../Logger";
import { setupMCPServerHub } from "../McpHub/AnthropicMcpHub/McpHub";
import { initUsers } from "../SecurityManager/initUsers";
import { getAuth } from "../authConfig/getAuth";
import {
  subscribeToAuthSetupChanges,
  type AuthSetupDataListener,
} from "../authConfig/subscribeToAuthSetupChanges";
import { setupLLM } from "../publishMethods/askLLM/setupLLM";
import { publishMethods } from "../publishMethods/publishMethods";
import { insertStateDatabase } from "./insertStateDatabase";
import { getProstglesState } from "./tryStartProstgles";

let authSetupDataListener: AuthSetupDataListener | undefined;

let backupManager: BackupManager | undefined;
export const initBackupManager = async (db: DB, dbs: DBS) => {
  backupManager ??= await BackupManager.create(db, dbs, connMgr);
  return backupManager;
};

export const getBackupManager = () => backupManager;

export const onProstglesReady = async (
  params: Parameters<OnReadyCallback<DBGeneratedSchema, SUser>>[0],
  update: Parameters<OnReadyCallback<DBGeneratedSchema, SUser>>[1],
  app: e.Express,
  con: DBSConnectionInfo,
) => {
  await promiseCleanup(async () => {
    const { dbo: db } = params;
    const _db: DB = params.db;

    setLoggerDBS(params.dbo);

    await initUsers(db, _db);
    const servicesSub = await db.services.subscribe(
      { status: "running" },
      { select: { status: 1 } },
      () => {
        void update(
          {
            publishMethods,
          },
          true,
        );
      },
    );

    await insertStateDatabase(db, _db, con, getProstglesState().isElectron);
    await setupLLM(db);
    await setupMCPServerHub(db);

    await connMgr.destroy();
    await connMgr.init(db, _db);
    getServiceManager(db);

    // await backupManager?.destroy();
    backupManager ??= await BackupManager.create(_db, db, connMgr);

    const newAuthSetupDataListener = subscribeToAuthSetupChanges(
      db,
      async (authData) => {
        const auth = await getAuth(app, db, authData);
        void update({
          auth,
        });
      },
      authSetupDataListener,
    );
    authSetupDataListener = newAuthSetupDataListener;

    return {
      cleanup: async () => {
        await servicesSub.unsubscribe();
        await backupManager?.destroy();
      },
    };
  });
};

type AsyncCleanup = () => Promise<{ cleanup: () => Promise<void> }>;
let oldCleanups: ReturnType<AsyncCleanup> | undefined;
const promiseCleanup = async (func: AsyncCleanup) => {
  const previous = oldCleanups;
  oldCleanups = func();

  if (previous) {
    const { cleanup } = await previous;
    await cleanup().catch((e) => {
      console.error("Error during prostgles onReady cleanup", e);
    });
  }
};
