import type { EventInfo } from "prostgles-server/dist/Logging";
import { getSerialisableError, safeStringify } from "prostgles-types";

const excludedTableCommands = new Set([
  "count",
  "find",
  "findOne",
  "getColumns",
  "getInfo",
  "size",
]);
const retainedDebugCommands = new Set([
  "DboBuilder.onCommit",
  "DboBuilder.onRollback",
]);

export const serialiseTestLog = (e: EventInfo, connection_id: string | null) => {
  const created = new Date().toISOString();
  try {
    const seen = new WeakSet<object>();
    return JSON.stringify(
      {
        created,
        connection_id,
        ...e,
        // These contain sockets, database handlers and other runtime objects.
        localParams: undefined,
        txInfo: undefined,
        syncParams: undefined,
        // Full trigger snapshots are redundant on every pub/sub event.
        triggers:
          e.type === "syncOrSub" && e.command === "refreshTriggers" ?
            e.triggers
          : undefined,
      },
      (_key, value: unknown) => {
        if (typeof value === "bigint") return value.toString();
        if (typeof value !== "object" || value === null) return value;
        if (seen.has(value)) return "[Circular]";
        seen.add(value);
        if (value instanceof Map) return Object.fromEntries(value);
        if (value instanceof Error) return getSerialisableError(value, true);
        return value;
      },
    );
  } catch (error) {
    return safeStringify({
      created,
      connection_id,
      type: e.type,
      command: "command" in e ? e.command : undefined,
      serialization_error: getSerialisableError(error, true),
    });
  }
};

export const shouldLogTestEvent = (event: EventInfo) => {
  if ("error" in event && event.error !== undefined) return true;
  if (event.type === "table") {
    return !excludedTableCommands.has(event.command);
  }
  if (event.type === "debug") {
    return retainedDebugCommands.has(event.command);
  }
  return !["auth", "connect.getClientSchema", "method"].includes(event.type);
};
