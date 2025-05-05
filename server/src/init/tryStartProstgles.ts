import type { Express } from "express";
import { isEqual } from "prostgles-types";
import type { Server } from "socket.io";
import { tout } from "..";
import type { ProstglesState } from "../../../commonTypes/electronInitTypes";
import { cleanupTestDatabases } from "./cleanupTestDatabases";
import type { DBSConnectionInfo } from "../electronConfig";
import { getElectronConfig } from "../electronConfig";
import { DBS_CONNECTION_INFO } from "../envVars";
import { setDBSRoutesForElectron } from "./setDBSRoutesForElectron";
import { isRetryableError } from "./isRetryableError";
import {
  getBackupManager,
  startProstgles,
  type InitExtra,
  type ProstglesInitStateWithDBS,
} from "./startProstgles";

type StartArguments = {
  app: Express;
  io: Server;
  con: DBSConnectionInfo | undefined;
  port: number;
  host: string;
};

type FinishedState = Exclude<ProstglesInitStateWithDBS, { state: "loading" }>;
type StateListener = (state: FinishedState) => void;

export const startupState: {
  listeners: StateListener[];
  state: ProstglesInitStateWithDBS;
  set: (state: FinishedState) => void;
  onReady: (cb: StateListener) => void;
} = {
  listeners: [],
  state: {
    state: "loading",
  },
  set: (state: FinishedState) => {
    startupState.state = state;
    startupState.listeners.forEach((listener) => listener(state));
    startupState.listeners = [];
  },
  onReady: (cb: StateListener) => {
    if (startupState.state.state !== "loading") {
      cb(startupState.state as FinishedState);
      return;
    }
    startupState.listeners.push(cb);
  },
};

const RETRY_CONFIG = {
  maxAttempts: 3, // Maximum number of attempts
  initialDelayMs: 1000, // Initial delay before first retry
  backoffFactor: 2, // Multiplier for delay (exponential backoff)
  maxDelayMs: 30000, // Maximum delay between retries
  jitterFactor: 0.3, // Percentage of delay to use for jitter (0 to 1)
};

export let startingProstglesResult:
  | {
      args: StartArguments;
      result: ReturnType<typeof tryStartProstgles>;
    }
  | undefined = undefined;

const connHistory: string[] = [];
export const tryStartProstgles = async (
  args: StartArguments,
): Promise<FinishedState> => {
  const config = startingProstglesResult;
  if (
    config &&
    (await config.result).state === "error" &&
    !isEqual(args, config.args)
  ) {
    startingProstglesResult = undefined;
  }
  startingProstglesResult ??= { args, result: _tryStartProstgles(args) };
  return await startingProstglesResult.result;
};

const _tryStartProstgles = async ({
  app,
  io,
  port,
  host,
  con = DBS_CONNECTION_INFO,
}: StartArguments): Promise<FinishedState> => {
  /** Cleanup state for local tests */
  await cleanupTestDatabases(con);

  setDBSRoutesForElectron(app, io, port, host);

  let lastError:
    | Extract<ProstglesInitStateWithDBS, { state: "error" }>
    | undefined = undefined;
  let attempt = 0;

  const connHistoryItem = JSON.stringify(con);
  if (connHistory.includes(connHistoryItem)) {
    console.error("DUPLICATE UNFINISHED CONNECTION");
    return {
      state: "error",
      error: "Duplicate connection attempt",
      errorType: "init",
    };
  }
  connHistory.push(connHistoryItem);

  while (attempt < RETRY_CONFIG.maxAttempts) {
    attempt++;

    try {
      console.log(`Attempt ${attempt} to connect to state database...`);
      const attemptResult = await startProstgles({
        app,
        io,
        con,
        port,
        host,
      });
      if (attemptResult.state === "ok") {
        startupState.set(attemptResult);
        return attemptResult;
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
    } catch (err: unknown) {
      console.error("startProstgles fail: ", err);
      lastError = {
        state: "error",
        errorType: "init",
        error: err as Error,
      };
      break;
    }
  }

  const erroredState = {
    state: "error",
    errorType: lastError?.errorType ?? "init",
    error: lastError?.error ?? "Failed to start prostgles. Check logs",
  } satisfies FinishedState;

  startupState.set(erroredState);

  console.error("Failed to start prostgles: ", lastError);

  return erroredState;
};

export const getProstglesState = (): ProstglesState<InitExtra> => {
  const eConfig = getElectronConfig();
  const isElectron = Boolean(eConfig?.isElectron);
  return {
    isElectron,
    initState: { ...startupState.state },
    electronCredsProvided: Boolean(eConfig?.hasCredentials()),
  };
};
