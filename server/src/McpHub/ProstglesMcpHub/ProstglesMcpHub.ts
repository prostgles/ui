import type { McpToolCallResponse } from "@common/mcp";
import type { DBS } from "@src/index";
import {
  getJSONBSchemaValidationError,
  getKeys,
  getSerialisableError,
  includes,
  tryCatchV2,
} from "prostgles-types";
import type {
  McpCallContext,
  ProstglesMcpServerHandler,
} from "./ProstglesMCPServerTypes";
import { getProstglesMCPServer } from "./ProstglesMCPServers";

const servers: Map<
  string,
  Awaited<ReturnType<ProstglesMcpServerHandler["start"]>>
> = new Map();

const init = async (dbs: DBS) => {
  const sub = await dbs.mcp_servers.subscribe(
    {
      command: "prostgles-local",
    },
    {
      select: {
        "*": 1,
        mcp_server_configs: "*",
      },
    },
    (serverRecords) => {
      for (const serverRecord of serverRecords) {
        if (!servers.has(serverRecord.name) && serverRecord.enabled) {
          const serverInfo = getProstglesMCPServer(serverRecord.name);
          if (!serverInfo) {
            console.error(
              `Prostgles MCP server name invalid: ${serverRecord.name}`,
            );
          } else {
            const { handler } = serverInfo;
            // const { config_schema } = definition;
            // const configs =
            //   serverRecord.mcp_server_configs as DBSSchema["mcp_server_configs"][];
            // const firstConfig = configs[0]?.config;
            // const validation =
            //   config_schema &&
            //   getJSONBSchemaValidationError(config_schema, firstConfig);
            // if (validation?.error !== undefined) {
            //   console.error(
            //     `Prostgles MCP server config invalid for server ${serverRecord.name}: ${validation.error}`,
            //   );
            //   continue;
            // }

            void (async () => {
              const instance = await handler.start(dbs);
              servers.set(serverRecord.name, instance);
            })();
          }
        } else if (servers.has(serverRecord.name) && !serverRecord.enabled) {
          void servers.get(serverRecord.name)?.stop();
        }
      }
    },
  );

  const getServer = (serverName: string) => {
    const server = servers.get(serverName);
    const serverDefinition = getProstglesMCPServer(serverName);

    return {
      server,
      serverDefinition,
    };
  };

  const getExpectedServer = (serverName: string) => {
    const { server, serverDefinition } = getServer(serverName);
    if (!server || !serverDefinition) {
      if (!serverDefinition) {
        throw new Error(`MCP server ${serverName} not found`);
      }
      throw new Error(`MCP server ${serverName} not enabled`);
    }
    return { server, serverDefinition };
  };

  const callTool = async (
    serverName: string,
    toolName: string,
    args: unknown,
    context: McpCallContext,
  ): Promise<McpToolCallResponse> => {
    const result = await tryCatchV2(async () => {
      const { server, serverDefinition } = getExpectedServer(serverName);
      const toolDefinition = getProperty(
        serverDefinition.definition.tools,
        toolName,
      );
      const toolMethod = getProperty(server.tools, toolName);
      if (!toolMethod || !toolDefinition) {
        throw new Error(`MCP server tool ${serverName}.${toolName} not found`);
      }
      const { schema } = toolDefinition;
      const validation =
        //@ts-ignore
        schema ? getJSONBSchemaValidationError(schema, args) : undefined;
      if (validation?.error !== undefined) {
        throw new Error(
          `Invalid arguments for MCP server tool ${serverName}.${toolName}: ${validation.error}`,
        );
      }
      const res = await toolMethod(args, context);
      return res;
    });

    return {
      content: [
        {
          type: "text",
          text:
            result.hasError ?
              JSON.stringify(getSerialisableError(result.error))
            : JSON.stringify(result.data ?? {}),
        },
      ],
      isError: result.hasError,
    };
  };

  const fetchTools = async (serverName: string, context: McpCallContext) => {
    const { server } = getExpectedServer(serverName);
    return server.fetchTools(dbs, context);
  };
  const destroy = () => {
    return sub.unsubscribe();
  };

  return { destroy, callTool, fetchTools, getServer };
};

let inFlightInit: ReturnType<typeof init> | undefined;
export const getProstglesMcpHub = (dbs: DBS) => {
  inFlightInit ??= init(dbs);
  return inFlightInit;
};

const getProperty = <T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  prop: K,
): T[K] | undefined => {
  if (prop in obj && includes(getKeys(obj), prop)) {
    return obj[prop] as T[K];
  }
  return undefined;
};
