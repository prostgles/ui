import {
  CLIENT_LOGS_KEY,
  PERSISTED_CLIENT_LOGS_KEY,
} from "@common/constants";
import type { UseProstglesClientProps } from "prostgles-client";
import { getSerialisableError, omitKeys } from "prostgles-types";
import { isPlaywrightTest } from "src/i18n/i18nUtils";
import {
  appendClientLog,
  createClientLogBuffer,
  getClientLogBytes,
} from "./clientLogBuffer";

/** Add logs to window */
const maxClientLogBytes = 5_000_000;
const maxClientLogEntries = 10_000;
const maxOversizedEventPreviewChars = 10_000;
const excludedTableCommands = new Set([
  "count",
  "find",
  "findOne",
  "getColumns",
  "getInfo",
  "size",
]);
const clientLogLimits = {
  maxBytes: maxClientLogBytes,
  maxEntries: maxClientLogEntries,
};

let clientLogBuffer: ReturnType<typeof createClientLogBuffer> | undefined;

export const logClientEvents: UseProstglesClientProps["onDebug"] = (ev) => {
  if (!isPlaywrightTest || !shouldLogClientEvent(ev)) return;

  const serialisedEvent = serialiseClientEvent(ev);
  const buffer = getClientLogBuffer();
  appendClientLog(buffer, serialisedEvent, clientLogLimits);
  window[CLIENT_LOGS_KEY] = buffer.logs;
};

export const persistClientLogs = (reason: string) => {
  if (!isPlaywrightTest) return;
  const buffer = getClientLogBuffer();
  appendClientLog(
    buffer,
    JSON.stringify({
      type: "clientLog",
      command: "pageReload",
      created: new Date().toISOString(),
      data: { reason },
    }),
    clientLogLimits,
  );
  window[CLIENT_LOGS_KEY] = buffer.logs;
  try {
    sessionStorage.setItem(
      PERSISTED_CLIENT_LOGS_KEY,
      JSON.stringify(buffer.logs),
    );
  } catch (error) {
    console.error("Failed to persist client test logs", error);
  }
};

const getClientLogBuffer = () => {
  if (clientLogBuffer) return clientLogBuffer;
  const logs = window[CLIENT_LOGS_KEY] ?? getPersistedClientLogs();
  clientLogBuffer = createClientLogBuffer(logs, clientLogLimits);
  return clientLogBuffer;
};

const getPersistedClientLogs = (): unknown[] => {
  try {
    const persistedLogs = sessionStorage.getItem(PERSISTED_CLIENT_LOGS_KEY);
    sessionStorage.removeItem(PERSISTED_CLIENT_LOGS_KEY);
    if (!persistedLogs) return [];
    const logs: unknown = JSON.parse(persistedLogs);
    return Array.isArray(logs) ? logs : [];
  } catch (error) {
    console.error("Failed to restore client test logs", error);
    return [];
  }
};

const serialiseClientEvent = (
  ev: Parameters<NonNullable<UseProstglesClientProps["onDebug"]>>[0],
) => {
  const created = new Date().toISOString();
  try {
    const serialisedEvent = stringifyClientLog({
      ...ev,
      created,
      ...(ev.type === "sync" && {
        options: omitKeys(ev.options, ["db", "columns"]),
      }),
    });
    const originalBytes = getClientLogBytes(serialisedEvent);
    if (originalBytes <= maxClientLogBytes) return serialisedEvent;
    return stringifyClientLog({
      created,
      type: "clientLog",
      command: "oversizedEventOmitted",
      eventType: ev.type,
      eventCommand: "command" in ev ? ev.command : undefined,
      tableName: "tableName" in ev ? ev.tableName : undefined,
      originalBytes,
      truncatedText: serialisedEvent.slice(0, maxOversizedEventPreviewChars),
    });
  } catch (error) {
    return stringifyClientLog({
      created,
      type: "clientLog",
      command: "serializationError",
      eventType: ev.type,
      eventCommand: "command" in ev ? ev.command : undefined,
      error: getSerialisableError(error, true),
    });
  }
};

const stringifyClientLog = (value: object) => {
  const seen = new WeakSet<object>();
  return JSON.stringify(value, (_key, childValue: unknown) => {
    if (typeof childValue === "bigint") return childValue.toString();
    if (typeof childValue !== "object" || childValue === null) {
      return childValue;
    }
    if (seen.has(childValue)) return "[Circular]";
    seen.add(childValue);
    if (childValue instanceof Map) return Object.fromEntries(childValue);
    if (childValue instanceof Error) {
      return getSerialisableError(childValue, true);
    }
    return childValue;
  });
};

const shouldLogClientEvent = (
  event: Parameters<NonNullable<UseProstglesClientProps["onDebug"]>>[0],
) => {
  if (event.type === "table") {
    return !excludedTableCommands.has(event.command);
  }
  return event.type !== "method";
};
