import { getJSONBSchemaAsJSONSchema, isDefined } from "prostgles-types";
import type { DBS } from "../..";

import {
  getMCPFullToolName,
  getMCPToolNameParts,
  getProstglesMCPFullToolName,
  PROSTGLES_MCP_SERVERS_AND_TOOLS,
  type AllowedChatTool,
} from "@common/prostglesMcp";
import type { DBSSchema } from "@common/publishUtils";
import { getEntries } from "@common/utils";
import type { AuthClientRequest } from "prostgles-server/dist/Auth/AuthTypes";
import { getMCPServerTools } from "./prostglesLLMTools/getMCPServerTools";
import { getProstglesLLMTools } from "./prostglesLLMTools/getProstglesLLMTools";
import { getPublishedMethodsTools } from "./prostglesLLMTools/getPublishedMethodsTools";

export type GetLLMToolsArgs = {
  userType: string;
  chat: DBSSchema["llm_chats"];
  prompt: DBSSchema["llm_prompts"];
  dbs: DBS;
  connectionId: string;
  clientReq: AuthClientRequest;
};

export type MCPToolSchema = {
  name: string;
  description: string;
  input_schema: ReturnType<typeof getJSONBSchemaAsJSONSchema>;
};

export const getLLMToolsAllowedInThisChat = async ({
  userType,
  dbs,
  chat,
  connectionId,
  prompt,
  clientReq,
}: GetLLMToolsArgs): Promise<undefined | AllowedChatTool[]> => {
  const { id: chatId } = chat;
  const { serverSideFuncTools } = await getPublishedMethodsTools(dbs, {
    chatId,
    connectionId,
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
  const tools: Record<string, AllowedChatTool> = {};
  const mcpToolsWithInfo = mcpTools
    .map(({ id, ...tool }) => {
      const info = llm_chats_allowed_mcp_tools.find(
        ({ tool_id }) => tool_id === id,
      );
      if (!info) return;
      return {
        type: "mcp" as const,
        ...tool,
        ...info,
        auto_approve: Boolean(info.auto_approve),
      } satisfies AllowedChatTool;
    })
    .filter(isDefined);

  const { prostglesMCPTools, prostglesDBTools } = await getProstglesLLMTools({
    userType,
    dbs,
    chat,
    prompt,
    mcpToolsWithInfo,
    connectionId,
    clientReq,
  });

  /** Check for name collisions */
  [
    ...prostglesMCPTools.map((t) => {
      const toolNameParts = getMCPToolNameParts(t.name);
      if (!toolNameParts) {
        throw new Error(`Could not parse tool name parts for ${t.name}`);
      }
      return {
        ...t,
        tool_name: toolNameParts.toolName,
        server_name: toolNameParts.serverName,
      } satisfies AllowedChatTool;
    }),
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
          server_name: "prostgles-db-methods",
          auto_approve: Boolean(info.auto_approve),
        } satisfies AllowedChatTool;
      })
      .filter(isDefined),
    ...prostglesDBTools.map((t) => {
      return {
        ...t,
      } satisfies AllowedChatTool;
    }),
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
