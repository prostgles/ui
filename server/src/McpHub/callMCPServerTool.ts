import type { McpToolCallResponse } from "@common/mcp";
import type { DBSSchema } from "@common/publishUtils";
import {
  getJSONBObjectSchemaValidationError,
  getSerialisableError,
  tryCatchV2,
} from "prostgles-types";
import type { DBS } from "..";
import { startMcpHub } from "./AnthropicMcpHub/startMcpHub";
import { getProstglesMCPServer } from "./ProstglesMcpHub/ProstglesMCPServers";
import { getProstglesMcpHub } from "./ProstglesMcpHub/ProstglesMcpHub";
import type { AuthClientRequest } from "prostgles-server/dist/Auth/AuthTypes";

export const callMCPServerTool = async (
  user: Pick<DBSSchema["users"], "id">,
  chat_id: number,
  dbs: DBS,
  serverName: string,
  toolName: string,
  toolArguments: Record<string, unknown> | undefined,
  clientReq: AuthClientRequest,
): Promise<McpToolCallResponse> => {
  const start = new Date();
  const argErrors = getJSONBObjectSchemaValidationError(
    {
      serverName: "string",
      toolName: "string",
      chat_id: "integer",
    },
    {
      serverName,
      toolName,
      chat_id,
    },
    undefined,
    false,
  );
  if (argErrors.error) throw new Error(argErrors.error);
  const result = await tryCatchV2(async () => {
    const chat = await dbs.llm_chats.findOne({ id: chat_id, user_id: user.id });
    if (!chat) {
      throw new Error("Chat not found");
    }
    const chatAllowedMCPTool = await dbs.llm_chats_allowed_mcp_tools.findOne({
      chat_id,
      $existsJoined: {
        mcp_server_tools: {
          server_name: serverName,
          name: toolName,
        },
      },
    });
    if (!chatAllowedMCPTool) {
      throw new Error("Tool invalid or not allowed for this chat");
    }

    const prostglesMcp = getProstglesMCPServer(serverName);
    if (prostglesMcp) {
      const prglMcpHub = await getProstglesMcpHub(dbs);
      return prglMcpHub.callTool(serverName, toolName, toolArguments, {
        chat_id,
        user_id: user.id,
        clientReq,
      });
    }

    const mcpHub = await startMcpHub(dbs);
    const res = await mcpHub.callTool(
      [serverName, chatAllowedMCPTool.server_config_id]
        .filter(Boolean)
        .join("_"),
      toolName,
      toolArguments,
    );
    return res;
  });

  await dbs.mcp_server_tool_calls.insert({
    duration: `${result.duration}ms` as {},
    called: start,
    mcp_server_name: serverName,
    mcp_tool_name: toolName,
    input: toolArguments,
    output: result.data,
    error: getSerialisableError(result.error) || null,
    chat_id,
    user_id: user.id,
  });

  if (result.hasError) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text:
            result.error instanceof Error ?
              result.error.message
            : JSON.stringify(result.error),
        },
      ],
    };
  }

  return result.data;
};
