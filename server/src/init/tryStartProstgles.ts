import type { Express } from "express";
import type { Server } from "socket.io";
import type { DBS } from "..";
import { tout } from "..";
import type { ProstglesInitState } from "../../../commonTypes/electronInit";
import { cleanupTestDatabases } from "../cleanupTestDatabases";
import type { DBSConnectionInfo } from "../electronConfig";
import { getElectronConfig } from "../electronConfig";
import { DBS_CONNECTION_INFO } from "../envVars";
import { setDBSRoutesForElectron } from "../setDBSRoutesForElectron";
import { isRetryableError } from "./isRetryableError";
import {
  getBackupManager,
  startProstgles,
  type ProstglesStartupState,
} from "./startProstgles";

type StartArguments = {
  app: Express;
  io: Server;
  con: DBSConnectionInfo | undefined;
  port: number;
  host: string;
};

const _initState: Pick<
  ProstglesInitState,
  "initError" | "connectionError" | "electronIssue"
> & {
  ok: boolean;
  loading: boolean;
  loaded: boolean;
  httpListening?: {
    port: number;
  };
  dbs: DBS | undefined;
} = {
  ok: false,
  loading: false,
  loaded: false,
  dbs: undefined,
};

export type InitState = typeof _initState;

const RETRY_CONFIG = {
  maxAttempts: 3, // Maximum number of attempts
  initialDelayMs: 1000, // Initial delay before first retry
  backoffFactor: 2, // Multiplier for delay (exponential backoff)
  maxDelayMs: 30000, // Maximum delay between retries
  jitterFactor: 0.3, // Percentage of delay to use for jitter (0 to 1)
};

let connHistory: string[] = [];
export const tryStartProstgles = async ({
  app,
  io,
  port,
  host,
  con = DBS_CONNECTION_INFO,
}: StartArguments): Promise<
  Pick<ProstglesInitState, "ok" | "initError" | "connectionError">
> => {
  /** Cleanup state for local tests */
  await cleanupTestDatabases(con);

  setDBSRoutesForElectron(app, io, port, host);

  let lastError: Exclude<ProstglesStartupState, { ok: true }> | undefined =
    undefined;
  let attempt = 0;
  _initState.connectionError = null;
  _initState.loading = true;

  const connHistoryItem = JSON.stringify(con);
  if (connHistory.includes(connHistoryItem)) {
    console.error("DUPLICATE UNFINISHED CONNECTION");
    return {
      ok: false,
      initError: "Duplicate connection attempt",
    };
  }
  connHistory.push(connHistoryItem);

  while (attempt < RETRY_CONFIG.maxAttempts) {
    attempt++;

    try {
      const attemptResult = await startProstgles({
        app,
        io,
        con,
        port,
        host,
      });
      if (attemptResult.ok) {
        _initState.dbs = attemptResult.dbs;
        _initState.ok = true;
        _initState.loading = false;
        _initState.loaded = true;
        _initState.initError = undefined;
        _initState.connectionError = undefined;
        return {
          ok: true,
          initError: undefined,
          connectionError: undefined,
        };
      }

      lastError = attemptResult;
      if (!isRetryableError(lastError)) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const exponentialDelay =
        RETRY_CONFIG.initialDelayMs *
        Math.pow(RETRY_CONFIG.backoffFactor, attempt - 1);
      const delay = Math.min(exponentialDelay, RETRY_CONFIG.maxDelayMs); // Cap the delay
      const jitter =
        delay * RETRY_CONFIG.jitterFactor * (Math.random() - 0.5) * 2; // Apply jitter (+/-)
      const waitTime = Math.max(0, Math.round(delay + jitter)); // Ensure non-negative delay

      console.log(`Attempt ${attempt} failed. Retrying in ${waitTime}ms...`);
      await tout(waitTime);
    } catch (err) {
      console.error("startProstgles fail: ", err);
      _initState.ok = false;
      _initState.initError = err;
      break;
    }
  }

  _initState.ok = false;
  _initState.dbs = undefined;
  _initState.loading = false;
  _initState.loaded = true;

  if (lastError && getInitState().isElectron) {
    _initState.connectionError = lastError.connectionError;
    _initState.initError = lastError.initError;
  } else {
    console.error("Failed to start prostgles: ", lastError);
    _initState.initError = "Failed to start prostgles. Check logs";
  }

  return {
    ok: false,
    initError: _initState.initError,
    connectionError: _initState.connectionError,
  };
};

export const getInitState = (): typeof _initState & ProstglesInitState => {
  const eConfig = getElectronConfig();
  const bkpManager = getBackupManager();
  return {
    isElectron: !!eConfig?.isElectron,
    electronCredsProvided: !!eConfig?.hasCredentials(),
    ..._initState,
    canDumpAndRestore: bkpManager?.installedPrograms,
  };
};
