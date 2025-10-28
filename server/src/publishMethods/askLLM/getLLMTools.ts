import {
  getJSONBSchemaAsJSONSchema,
  isDefined,
  type JSONB,
} from "prostgles-types";
import type { DBS } from "../..";

import {
  getMCPFullToolName,
  getProstglesMCPFullToolName,
  PROSTGLES_MCP_SERVERS_AND_TOOLS,
  type ProstglesMcpTool,
} from "@common/prostglesMcp";
import type { DBSSchema } from "@common/publishUtils";
import { getEntries } from "@common/utils";
import { getDockerMCP } from "../../DockerManager/getDockerMCP";
import { getProstglesLLMTools } from "./prostglesLLMTools/getProstglesLLMTools";

export type GetLLMToolsArgs = {
  userType: string;
  chat: DBSSchema["llm_chats"];
  prompt: DBSSchema["llm_prompts"];
  dbs: DBS;
  connectionId: string;
};

export type MCPToolSchema = {
  name: string;
  description: string;
  input_schema: ReturnType<typeof getJSONBSchemaAsJSONSchema>;
};

export type MCPToolSchemaWithApproveInfo = MCPToolSchema &
  (
    | {
        type: "mcp";
        auto_approve: boolean;
      }
    | (ProstglesMcpTool & {
        auto_approve: boolean;
      })
  );
export const getLLMAllowedChatTools = async ({
  userType,
  dbs,
  chat,
  connectionId,
  prompt,
}: GetLLMToolsArgs): Promise<undefined | MCPToolSchemaWithApproveInfo[]> => {
  const { id: chatId } = chat;
  const { serverSideFuncTools } = await getPublishedMethodsTools(dbs, {
    connection_id: connectionId,
    $existsJoined: {
      llm_chats_allowed_functions: {
        chat_id: chatId,
      },
    },
  });
  const llm_chats_allowed_functions =
    await dbs.llm_chats_allowed_functions.find({
      chat_id: chatId,
    });

  const llm_chats_allowed_mcp_tools =
    await dbs.llm_chats_allowed_mcp_tools.find({
      chat_id: chatId,
    });
  const { mcpTools } = await getMCPServerTools(dbs, {
    $existsJoined: {
      llm_chats_allowed_mcp_tools: {
        chat_id: chatId,
      },
    },
  });
  const tools: Record<string, MCPToolSchemaWithApproveInfo> = {};
  const dockerMCP = await getDockerMCP(dbs, chat);
  const mcpToolsWithInfo = mcpTools
    .map(({ id, ...tool }) => {
      const info = llm_chats_allowed_mcp_tools.find(
        ({ tool_id }) => tool_id === id,
      );
      const toolInfo = dockerMCP.toolSchemas.find((t) => t.name === tool.name);
      if (!info) return;
      return {
        type: "mcp" as const,
        ...tool,
        ...info,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        input_schema: toolInfo?.inputSchema ?? tool.input_schema,
        description: toolInfo?.description ?? tool.description,
        auto_approve: Boolean(info.auto_approve),
      };
    })
    .filter(isDefined);

  const { mcpToolsWithDocker, prostglesDBTools } = await getProstglesLLMTools({
    userType,
    dbs,
    chat,
    prompt,
    mcpToolsWithInfo,
  });

  /** Check for name collisions */
  [
    ...mcpToolsWithDocker,
    ...serverSideFuncTools
      .map(({ id, ...t }) => {
        const info = llm_chats_allowed_functions.find(
          ({ server_function_id }) => server_function_id === id,
        );
        if (!info) return;
        return {
          type: "prostgles-db-methods" as const,
          ...t,
          ...info,
          auto_approve: Boolean(info.auto_approve),
        };
      })
      .filter(isDefined),
    ...prostglesDBTools,
  ].forEach((tool) => {
    const { name } = tool;
    if (tools[name]) {
      throw new Error(
        `Tool name collision: ${name} is used by both MCP tool and/or other function`,
      );
    }
    tools[name] = tool;
  });
  const toolList = Object.values(tools);

  return toolList;
};

export const getAllToolNames = async (dbs: DBS): Promise<string[]> => {
  const mcpTools = await dbs.mcp_server_tools.find();
  const publishedMethods = await dbs.published_methods.find();

  return [
    ...mcpTools.map((t) => getMCPFullToolName(t.server_name, t.name)),
    ...publishedMethods.map((t) =>
      getProstglesMCPFullToolName("prostgles-db-methods", t.name),
    ),
    ...getEntries(PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-db"]).map(
      ([toolName]) => getProstglesMCPFullToolName("prostgles-db", toolName),
    ),
    ...getEntries(PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]).map(
      ([toolName]) => getProstglesMCPFullToolName("prostgles-ui", toolName),
    ),
  ];
};

const getMCPServerTools = async (
  dbs: DBS,
  filter: Parameters<typeof dbs.mcp_server_tools.find>[0],
) => {
  const mcp_server_tools = await dbs.mcp_server_tools.find(filter);
  const mcpTools = mcp_server_tools.map((t) => {
    return {
      id: t.id,
      name: getMCPFullToolName(t.server_name, t.name),
      description: t.description,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      input_schema: t.inputSchema,
    } satisfies MCPToolSchema & { id: number };
  });
  return { mcpTools, mcp_server_tools };
};

const getPublishedMethodsTools = async (
  dbs: DBS,
  filter: Parameters<typeof dbs.published_methods.find>[0],
) => {
  const published_methods = await dbs.published_methods.find(filter);
  const serverSideFuncTools = published_methods.map((m) => {
    const { name, description, arguments: _arguments, id } = m;
    const properties = _arguments.reduce(
      (acc, arg) => ({
        ...acc,
        [arg.name]:
          (
            arg.type === "JsonbSchema" ||
            arg.type === "Lookup" ||
            arg.type === "Lookup[]"
          ) ?
            "any"
          : arg.type,
      }),
      {} as JSONB.ObjectType["type"],
    );
    return {
      id,
      tool_name: name,
      name: getProstglesMCPFullToolName("prostgles-db-methods", name),
      description,
      input_schema: getJSONBSchemaAsJSONSchema(
        "published_methods",
        "arguments",
        {
          type: properties,
        },
      ),
    } satisfies MCPToolSchema & { id: number; tool_name: string };
  });
  return { serverSideFuncTools, published_methods };
};
