import type { EventInfo } from "prostgles-server/dist/Logging";
import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";
import { pickKeys } from "prostgles-types";
import { connMgr, type DBS } from ".";

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
      created: "TIMESTAMP DEFAULT NOW()",
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
  if (!connMgr.connectionChecker.config.global_setting?.enable_logs)
    return true;
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
const isPlaywright = process.env.PLAYWRIGHT_TEST === "true";

export const addLog = (e: EventInfo, connection_id: string | null) => {
  if (isPlaywright) {
    console.log(
      //@ts-ignore
      e.command,
      //@ts-ignore
      e.table_name || e.tableName,
      //@ts-ignore
      e.filter || e.data?.filter || e.condition,
      //@ts-ignore
      e.channel_name,
    );
  }
  if (shouldExclude(e, connection_id === null)) return;
  logRecords.push({ e, connection_id, created: new Date() });
  const batchSize = 20;
  const { dbs } = loggerConfig ?? {};
  if (dbs && logRecords.length > batchSize) {
    const getSid = (e: EventInfo) => {
      if (e.type === "table" || e.type === "sync") {
        const { clientReq } = e.localParams ?? {};
        return (
          clientReq?.socket ? clientReq.socket.__prglCache?.session.sid
          : clientReq?.httpReq ? clientReq.httpReq.cookies["sid"]
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
    dbs.logs.insert(
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
