import type { TableHandler } from "prostgles-types";
import { callWorkflowProxy } from "./callWorkflowProxy";
import type { ProxyDbCallData } from "./defineAgenticWorkflowHandlers.types";

export const tableHandlers = new Proxy(
  {},
  {
    get(_target, tableName: string) {
      if (typeof tableName !== "string") return undefined;
      const commandProxy = new Proxy(
        {},
        {
          get(_target, command: keyof TableHandler) {
            if (typeof command !== "string") return undefined;
            return (...args: unknown[]) => {
              if (command === "find" || command === "findOne") {
                const result = callCommand("find", args, (filter, params) => {
                  return {
                    type: "db/find",
                    tableName,
                    filter,
                    ...params,
                    ...(command === "findOne" && { limit: 1 }),
                  };
                });
                return command === "findOne" ?
                    result.then((rows: unknown[]) => rows[0])
                  : result;
              } else if (command === "count") {
                return callCommand(command, args, (filter, params) => {
                  return {
                    type: `db/${command}` as const,
                    tableName,
                    filter,
                    ...params,
                  };
                });
              } else if (command === "update") {
                return callCommand(command, args, (filter, data, params) => {
                  return {
                    type: `db/${command}` as const,
                    tableName,
                    filter,
                    data,
                    ...params,
                  };
                });
              } else if (command === "insert") {
                return callCommand(command, args, (data, params) => {
                  return {
                    type: `db/${command}` as const,
                    tableName,
                    data,
                    ...params,
                  };
                });
              } else if (command === "insertMany") {
                return callCommand(command, args, (data, params) => {
                  return {
                    type: `db/${command}` as const,
                    tableName,
                    data,
                    ...params,
                  };
                });
              } else if (command === "delete") {
                return callCommand(command, args, (filter, params) => {
                  return {
                    type: `db/${command}` as const,
                    tableName,
                    filter,
                    ...params,
                  };
                });
              } else {
                throw new Error(
                  `Unsupported command ${command} on tableHandler. Only ${proxyTableHandlerCommands.join(", ")} are supported.`,
                );
              }
            };
          },
        },
      );
      return commandProxy;
    },
  },
);

const callCommand = <Command extends keyof TableHandler>(
  command: Command,
  args: any,
  cb: (...args: Parameters<TableHandler[Command]>) => ProxyDbCallData,
) => {
  const proxyData = cb(...args);
  if (proxyData.type !== `db/${command}`) {
    throw new Error(
      `Invalid command. Expected db/${command} but got ${proxyData.type}`,
    );
  }
  return callWorkflowProxy(
    "data" in proxyData ?
      { ...proxyData, data: encodeFileBuffers(proxyData.data) }
    : proxyData,
  );
};

const proxyCommands: Record<ProxyDbCallData["type"], 1> = {
  "db/count": 1,
  "db/find": 1,
  "db/insert": 1,
  "db/insertMany": 1,
  "db/update": 1,
  "db/delete": 1,
  "db/execute_sql": 1,
  "db/execute_readonly_sql": 1,
};
export const proxyDbCommands = Object.keys(proxyCommands).map((c) =>
  c.replace("db/", ""),
);
const proxyTableHandlerCommands = [
  "findOne",
  ...proxyDbCommands.filter((cmd) => !cmd.includes("execute_")),
];

const encodeFileBuffers = (value: unknown): unknown => {
  if (Buffer.isBuffer(value)) {
    return { encoding: "base64", data: value.toString("base64") };
  }
  if (Array.isArray(value)) return value.map(encodeFileBuffers);
  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        encodeFileBuffers(nestedValue),
      ]),
    );
  }
  return value;
};
