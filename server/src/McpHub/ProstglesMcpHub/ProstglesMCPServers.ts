import type { MCPServerInfo } from "@common/mcp";
import type { JsonSchemaType } from "@modelcontextprotocol/sdk/validation/types";
import { getDockerMCP } from "@src/DockerManager/getDockerMCP";
import { tout, type DBS } from "@src/index";
import { getKeys, includes, omitKeys, type JSONB } from "prostgles-types";
import type { McpTool } from "../McpTypes";
import type { DBSSchema } from "@common/publishUtils";

export type ProstglesMcpServerDefinition = {
  icon_path: string;
  label: string;
  description: string;
  tools: Record<
    string,
    {
      description: string;
      inputSchema: JSONB.FieldType | undefined;
      outputSchema: JSONB.FieldType | undefined;
    }
  >;
  config_schema: JSONB.FieldType | undefined;
};

export type JSONBTypeIfDefined<Schema extends JSONB.FieldType | undefined> =
  Schema extends JSONB.FieldType ? JSONB.GetType<Schema> : undefined;

type MaybePromise<T> = T | Promise<T>;

export type ProstglesMcpServerHandler<
  ServerDefinition extends ProstglesMcpServerDefinition,
> = {
  start: (
    config: JSONBTypeIfDefined<ServerDefinition["config_schema"]>,
  ) => MaybePromise<{
    stop: () => MaybePromise<void>;
    callTool: <ToolName extends keyof ServerDefinition["tools"]>(
      toolName: ToolName,
      toolArguments: JSONBTypeIfDefined<
        ServerDefinition["tools"][ToolName]["inputSchema"]
      >,
      context: { chat: DBSSchema["llm_chats"]; user: DBSSchema["users"] },
    ) => MaybePromise<
      JSONBTypeIfDefined<ServerDefinition["tools"][ToolName]["outputSchema"]>
    >;
  }>;
};

const ProstglesMCPServersWithTools = {
  "docker-sandbox": {
    icon_path: "Docker",
    command: "prostgles-local",
    fetchTools: async (dbs, chat) => {
      const tools = (await getDockerMCP(dbs, chat)).toolSchemas.map(
        ({ inputSchema, ...tool }) => ({
          ...tool,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          inputSchema: inputSchema as JsonSchemaType,
        }),
      );
      return tools;
    },
  },
  "web-search": {
    icon_path: "Web",
    command: "prostgles-local",
    fetchTools: async (dbs: DBS) => {
      await tout(1e3);
      // throw new Error("Web search MCP server not implemented yet");
      return [];
    },
  },
} satisfies Record<
  string,
  Omit<MCPServerInfo, "mcp_server_tools"> & {
    fetchTools: (
      dbs: DBS,
      chat: DBSSchema["llm_chats"] | undefined,
    ) => Promise<
      {
        name: string;
        description: string;
        inputSchema: McpTool["inputSchema"];
      }[]
    >;
  }
>;

export const ProstglesMCPServers = Object.fromEntries(
  Object.entries(ProstglesMCPServersWithTools).map(([key, value]) => [
    key,
    omitKeys(value, ["fetchTools"]),
  ]),
) satisfies Record<string, Omit<MCPServerInfo, "mcp_server_tools">>;

const ProstglesMCPServerNames = getKeys(ProstglesMCPServersWithTools);

export const getProstglesMCPServerWithTools = (serverName: string) =>
  includes(ProstglesMCPServerNames, serverName) ?
    ProstglesMCPServersWithTools[serverName]
  : undefined;
