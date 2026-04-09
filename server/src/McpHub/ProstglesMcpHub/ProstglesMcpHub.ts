import { getMCPFullToolName } from "@common/mcpUtils";
import type { DBS } from "@src/index";
import {
  getJSONBSchemaTSTypes,
  getJSONBSchemaValidationError,
  getKeys,
  getSerialisableError,
  includes,
  tryCatchV2,
} from "prostgles-types";
import type { McpToolCallResponse } from "../AnthropicMcpHub/McpHub";
import type {
  McpCallContext,
  McpCallContextFetchTools,
  ProstglesMcpServerDefinition,
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
        const serverInstance = servers.get(serverRecord.name);
        if (!serverInstance && serverRecord.enabled) {
          const serverInfo = getProstglesMCPServer(serverRecord.name);
          if (!serverInfo) {
            console.error(
              `Prostgles MCP server name invalid: ${serverRecord.name}`,
            );
          } else {
            const { handler } = serverInfo;
            // TODO: implement configs
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
        } else if (serverInstance && !serverRecord.enabled) {
          void serverInstance.stop();
          servers.delete(serverRecord.name);
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

  const validateToolInput = (
    serverName: string,
    toolName: string,
    args: unknown,
  ) => {
    const name = getMCPFullToolName(serverName, toolName);
    const { server, serverDefinition } = getExpectedServer(serverName);
    const toolDefinition = getProperty(
      (serverDefinition.definition as ProstglesMcpServerDefinition).tools,
      toolName,
    );
    const toolMethod = getProperty(server.tools, toolName);
    if (!toolMethod || !toolDefinition) {
      throw new Error(`MCP server tool ${name} not found`);
    }
    const { schema, outputSchema } = toolDefinition;
    const validation =
      //@ts-ignore
      schema ? getJSONBSchemaValidationError(schema, args) : undefined;
    if (validation?.error !== undefined) {
      throw new Error(
        [
          `Invalid arguments for MCP tool ${name}: ${validation.error}.`,
          !schema ? "" : (
            `Expected argument structure expressed in typescript types: ${getJSONBSchemaTSTypes(schema, {}, undefined, [])}`
          ),
        ].join("\n"),
      );
    }

    return { name, toolMethod, outputSchema };
  };

  const callTool = async (
    serverName: string,
    toolName: string,
    args: unknown,
    context: McpCallContext,
  ) => {
    const result = await tryCatchV2(async () => {
      const { name, toolMethod, outputSchema } = validateToolInput(
        serverName,
        toolName,
        args,
      );
      const toolCallResult = await toolMethod(args, context);
      const outputValidation =
        //@ts-ignore
        outputSchema ?
          getJSONBSchemaValidationError(outputSchema, toolCallResult, {
            allowExtraProperties: true,
          })
        : undefined;
      if (outputValidation?.error !== undefined) {
        throw new Error(
          [
            `Invalid output from MCP tool ${name}: ${outputValidation.error}.`,
            !outputSchema ? "" : (
              `Expected output structure expressed in typescript types: ${getJSONBSchemaTSTypes(
                typeof outputSchema === "string" ?
                  { type: outputSchema }
                : outputSchema,
                {},
                undefined,
                [],
              )}`
            ),
          ].join("\n"),
        );
      }
      return toolCallResult;
    });

    const errorData =
      result.hasError ? getSerialisableError(result.error) : undefined;
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
      structuredContent: !result.hasError ? result.data : errorData,
      isError: result.hasError,
    } satisfies McpToolCallResponse;
  };

  const fetchTools = (
    serverName: string,
    context: McpCallContextFetchTools,
  ) => {
    const { server } = getExpectedServer(serverName);
    return server.fetchTools(dbs, context);
  };
  const destroy = () => {
    return sub.unsubscribe();
  };

  return {
    destroy,
    callTool,
    validateToolInput,
    fetchTools,
    getServer,
    getServers: () => Array.from(servers.entries()),
  };
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
