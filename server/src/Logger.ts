import type { EventInfo } from "prostgles-server/dist/Logging";
import type { TableConfig } from "prostgles-server";
import { existsSync } from "fs";
import { appendFile, mkdir, readdir, rename, rm } from "fs/promises";
import { join } from "path";
import { pickKeys } from "prostgles-types";
import { type DBS } from ".";
import { getAuthSetupData } from "./authConfig/subscribeToAuthSetupChanges";
import {
  serialiseTestLog,
  shouldLogTestEvent,
} from "./serialiseTestLog";
import { getTestLogFiles } from "./testLogFiles";

export const loggerTableConfig: TableConfig<{ en: 1 }> = {
  logs: {
    columns: {
      id: `BIGSERIAL PRIMARY KEY`,
      connection_id: `UUID`,
      type: "TEXT",
      command: "TEXT",
      table_name: "TEXT",
      sid: "TEXT",
      tx_info: "JSONB",
      socket_id: "TEXT",
      duration: "NUMERIC",
      data: "JSONB",
      error: "JSON",
      has_error: "BOOLEAN",
      created: "TIMESTAMPTZ DEFAULT NOW()",
    },
  },
};

let loggerConfig:
  | {
      dbs: DBS;
    }
  | undefined;
export const setLoggerDBS = (dbs: DBS) => {
  loggerConfig = { dbs };
};

const shouldExclude = (e: EventInfo, isStateDb: boolean) => {
  if (!getAuthSetupData().stateDatabaseConfig?.enable_logs) return true;
  if (
    isStateDb &&
    e.type === "table" &&
    ["logs", "windows"].includes(e.tableName)
  ) {
    return true;
  }
  return false;
};

const logRecords: {
  e: EventInfo;
  connection_id: string | null;
  created: Date;
}[] = [];
const testLogPath =
  process.env.PRGL_TEST ? process.env.PRGL_TEST_LOG_PATH : undefined;
const testLogFiles = testLogPath ? getTestLogFiles(testLogPath) : undefined;
const maxTestLogBytes = 10_000_000;
const maxTestLogFiles = 10;
const maxOversizedEventPreviewChars = 10_000;
const testLogSaveInterval = 1_000;

const deleteExistingTestLogs = async () => {
  if (!testLogFiles) return;
  const fileNames = await readdir(testLogFiles.directory).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    },
  );
  await Promise.all(
    fileNames
      .filter(testLogFiles.isManagedFileName)
      .map((fileName) =>
        rm(join(testLogFiles.directory, fileName), { force: true }),
      ),
  );
};

let testLogBytes = 0;
let pendingTestLogs: string[] = [];
let testLogWriteTimer: NodeJS.Timeout | undefined;
let testLogWrite = deleteExistingTestLogs();

const addTestLog = (e: EventInfo, connection_id: string | null) => {
  if (!testLogPath || !shouldLogTestEvent(e)) return;
  const line = serialiseTestLog(e, connection_id) + "\n";
  pendingTestLogs.push(line);

  if (testLogWriteTimer) return;
  testLogWriteTimer = setTimeout(() => {
    testLogWriteTimer = undefined;
    const logsToWrite = pendingTestLogs;
    pendingTestLogs = [];
    testLogWrite = testLogWrite
      .then(() => writeTestLogs(logsToWrite))
      .catch((error: unknown) => {
        console.error("Failed to write test log artifact", error);
      });
  }, testLogSaveInterval);
};

const writeTestLogs = async (lines: string[]) => {
  if (!testLogPath || !testLogFiles) return;
  await mkdir(testLogFiles.directory, { recursive: true });

  let chunk = "";
  let chunkBytes = 0;
  const flushChunk = async () => {
    if (!chunk) return;
    await appendFile(testLogPath, chunk);
    testLogBytes += chunkBytes;
    chunk = "";
    chunkBytes = 0;
  };

  for (const originalLine of lines) {
    let line = originalLine;
    let lineBytes = Buffer.byteLength(line);
    if (lineBytes > maxTestLogBytes) {
      line = `${JSON.stringify({
        created: new Date().toISOString(),
        type: "testLog",
        command: "oversizedEventOmitted",
        originalBytes: lineBytes,
        truncatedText: originalLine.slice(0, maxOversizedEventPreviewChars),
      })}\n`;
      lineBytes = Buffer.byteLength(line);
    }
    if (testLogBytes + chunkBytes + lineBytes > maxTestLogBytes) {
      await flushChunk();
      await rotateTestLogs();
    }
    chunk += line;
    chunkBytes += lineBytes;
  }
  await flushChunk();
};

const rotateTestLogs = async () => {
  if (!testLogPath || !testLogFiles) return;
  await rm(testLogFiles.getArchivePath(maxTestLogFiles - 1), { force: true });
  for (let index = maxTestLogFiles - 2; index >= 1; index -= 1) {
    const source = testLogFiles.getArchivePath(index);
    if (existsSync(source)) {
      await rename(source, testLogFiles.getArchivePath(index + 1));
    }
  }
  if (existsSync(testLogPath)) {
    await rename(testLogPath, testLogFiles.getArchivePath(1));
  }
  testLogBytes = 0;
};

export const addLog = (e: EventInfo, connection_id: string | null) => {
  // if (e.type === "sync" && e.tableName === "windows") {
  //   console.log(
  //     e.command,
  //     e.tableName,
  //     pickKeys(e as any, [
  //       "state",
  //       "source",
  //       "condition",
  //       "last_synced",
  //       "is_syncing",
  //       "lr",
  //       "channelName",
  //       "rows",
  //     ]),
  //   );
  //   // if (
  //   //   e.command === "syncData"
  //   // ) {
  //   //   if (!_alreadyStarted && (e as any).is_syncing) {
  //   //     debugger;
  //   //   }
  //   //   _alreadyStarted = true;
  //   // }
  // }
  if (testLogPath) {
    addTestLog(e, connection_id);
  }
  if (shouldExclude(e, connection_id === null)) return;
  logRecords.push({ e, connection_id, created: new Date() });
  const batchSize = 20;
  const { dbs } = loggerConfig ?? {};
  if (dbs && logRecords.length > batchSize) {
    const getSid = (e: EventInfo): string | null | undefined => {
      if (e.type === "table" || e.type === "sync") {
        const { clientReq } = e.localParams ?? {};
        return (
          clientReq?.socket ?
            Array.from(clientReq.socket.__prglCache?.values() ?? [])[0]?.session
              .sid
          : clientReq?.httpReq ?
            (clientReq.httpReq.cookies as Record<string, string>)["sid"]
          : null
        );
      }
      if (e.type === "connect") {
        return e.sid;
      }
      if (e.type === "disconnect") {
        return e.sid;
      }
      if (e.type === "method") {
        return "not implemented";
      }
      return null;
    };
    const data =
      (
        e.type === "sync" &&
        (e.command === "pushData" || e.command === "upsertData")
      ) ?
        pickKeys(e, ["connectedSocketIds", "rows"])
      : e.type === "connect" || e.type === "disconnect" ?
        pickKeys(e, ["connectedSocketIds"])
      : e.type === "method" ? pickKeys(e, ["args"])
      : undefined;
    const batch = logRecords.splice(0, batchSize);
    void dbs.logs.insert(
      batch.map(({ connection_id, created, e }) => ({
        connection_id,
        created,
        type: e.type,
        command: "command" in e ? e.command : null,
        table_name: "tableName" in e ? e.tableName : null,
        sid: getSid(e),
        tx_info: e.type === "table" ? e.txInfo : null,
        error: "error" in e ? e.error : null,
        duration: "duration" in e ? e.duration : null,
        has_error: "error" in e && e.error !== undefined ? true : false,
        data,
      })),
      {},
      //@ts-ignore
      { noLog: true },
    );
  }
};
