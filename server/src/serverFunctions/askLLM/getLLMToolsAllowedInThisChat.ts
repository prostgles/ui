import { getJSONBSchemaAsJSONSchema, isDefined } from "prostgles-types";
import type { DBS } from "../..";

import {
  getMCPFullToolName,
  getMCPToolNameParts,
  type AllowedChatTool,
} from "@common/prostglesMcp";
import type { DBSSchema } from "@common/publishUtils";
import type { AuthClientRequest } from "prostgles-server/dist/Auth/AuthTypes";
import { getAgentGoalTools } from "./agentConstants";
import { getMCPServerTools } from "./prostglesLLMTools/getMCPServerTools";
import { getAllowedMcpTools } from "./prostglesLLMTools/getAllowedMcpTools";

export type GetLLMToolsArgs = {
  userType: string;
  chat: DBSSchema["llm_chats"];
  dbs: DBS;
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
  clientReq,
}: GetLLMToolsArgs): Promise<undefined | AllowedChatTool[]> => {
  const { id: chatId } = chat;

  const llm_chats_allowed_mcp_tools =
    await dbs.llm_chats_allowed_mcp_tools.find({
      chat_id: chatId,
    });
  const { mcpTools: mcpToolsWithoutExtraInfo } = await getMCPServerTools(dbs, {
    $existsJoined: {
      llm_chats_allowed_mcp_tools: {
        chat_id: chatId,
      },
    },
  });
  const tools: Map<string, AllowedChatTool> = new Map();
  if (chat.agent_info && chat.agent_info !== "orchestrator") {
    const agentGoalTools = getAgentGoalTools(chat.agent_info);
    agentGoalTools.forEach((agentGoalTool, index) => {
      tools.set(agentGoalTool.name, {
        ...agentGoalTool,
        auto_approve: true,
        mode: "auto-approved-user-actionable",
        server_name: "",
        tool_name: agentGoalTool.name,
        tool_id: -1 - index, // avoid collision with normal tools
      });
    });
  }
  const allowedMcpToolsWithInfo = mcpToolsWithoutExtraInfo
    .map(({ id, ...tool }) => {
      const info = llm_chats_allowed_mcp_tools.find(
        ({ tool_id }) => tool_id === id,
      );
      if (!info) return;
      return {
        ...tool,
        ...info,
        auto_approve: Boolean(info.auto_approve),
      } satisfies AllowedChatTool;
    })
    .filter(isDefined);

  const { mcpTools } = await getAllowedMcpTools({
    userType,
    dbs,
    chat,
    allowedMcpToolsWithInfo,
    clientReq,
  });

  /** Check for name collisions */
  [
    ...mcpTools.map((t) => {
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
  ].forEach((tool) => {
    const { name } = tool;
    if (tools.has(name)) {
      throw new Error(
        `Tool name collision: ${name} is used by both MCP tool and/or other function`,
      );
    }
    tools.set(name, tool);
  });
  const toolList = Array.from(tools.values());

  return toolList;
};

export const getAllToolNames = async (dbs: DBS): Promise<string[]> => {
  const mcpTools = await dbs.mcp_server_tools.find();

  return mcpTools.map((t) => getMCPFullToolName(t.server_name, t.name));
};
