import type { TableHandler } from "prostgles-types";
import { callWorkflowProxy } from "./callWorkflowProxy";
import type { ProxyDbCallData } from "./defineAgenticWorkflowHandlers.types";

export const tableHandlers = new Proxy({} as Record<string, unknown>, {
  get(_target, tableName: string) {
    if (typeof tableName !== "string") return undefined;
    const commandProxy = new Proxy({} as Record<string, unknown>, {
      get(_target, command: keyof TableHandler) {
        if (typeof command !== "string") return undefined;
        return (...args: unknown[]) => {
          if (command === "find") {
            return callCommand(command, args, (filter, params) => {
              return {
                type: `db/${command}` as const,
                tableName,
                filter,
                ...params,
              };
            });
          }
          if (command === "count") {
            return callCommand(command, args, (filter, params) => {
              return {
                type: `db/${command}` as const,
                tableName,
                filter,
                ...params,
              };
            });
          }

          if (command === "update") {
            return callCommand(command, args, (filter, data, params) => {
              return {
                type: `db/${command}` as const,
                tableName,
                filter,
                data,
                ...params,
              };
            });
          }

          if (command === "insert") {
            return callCommand(command, args, (data, params) => {
              return {
                type: `db/${command}` as const,
                tableName,
                data,
                ...params,
              };
            });
          }
          if (command === "delete") {
            return callCommand(command, args, (filter, params) => {
              return {
                type: `db/${command}` as const,
                tableName,
                filter,
                ...params,
              };
            });
          }
        };
      },
    });
    return commandProxy;
  },
});

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
  return callWorkflowProxy(proxyData);
};
