import type { EventInfo } from "prostgles-server/dist/Logging";
import type { TableConfig } from "prostgles-server";
import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";
import { getSerialisableError, omitKeys, pickKeys } from "prostgles-types";
import { type DBS } from ".";
import { getAuthSetupData } from "./authConfig/subscribeToAuthSetupChanges";

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
const maxTestLogCharacters = 64_000;
let testLogArtifact = "";
let testLogWriteTimer: NodeJS.Timeout | undefined;
let testLogWrite = Promise.resolve();

const serialiseTestLog = (e: EventInfo, connection_id: string | null) => {
  try {
    const loggedEvent =
      e.type === "table" || e.type === "method" ?
        omitKeys(e, ["localParams"])
      : undefined;
    if (!loggedEvent) return undefined;
    return JSON.stringify({
      created: new Date().toISOString(),
      connection_id,
      ...(getSerialisableError(e) as {}),
      loggedEvent,
    });
  } catch (error) {
    return JSON.stringify({
      created: new Date().toISOString(),
      connection_id,
      type: e.type,
      serialization_error: getSerialisableError(error),
    });
  }
};

const addTestLog = (e: EventInfo, connection_id: string | null) => {
  if (!testLogPath) return;
  const line = serialiseTestLog(e, connection_id);
  if (!line) return;
  testLogArtifact = (testLogArtifact + line + "\n").slice(
    -maxTestLogCharacters,
  );

  if (testLogWriteTimer) return;
  testLogWriteTimer = setTimeout(() => {
    testLogWriteTimer = undefined;
    testLogWrite = testLogWrite
      .then(async () => {
        await mkdir(dirname(testLogPath), { recursive: true });
        await writeFile(testLogPath, testLogArtifact);
      })
      .catch((error: unknown) => {
        console.error("Failed to write test log artifact", error);
      });
  }, 50);
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
