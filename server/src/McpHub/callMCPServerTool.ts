import { isEqual, tryCatchV2 } from "prostgles-types";
import type { DBS } from "..";
import type { McpToolCallResponse } from "../../../commonTypes/mcp";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import { startMcpHub } from "./McpHub";
import { getErrorAsObject } from "prostgles-server/dist/DboBuilder/dboBuilderUtils";

export const callMCPServerTool = async (
  user: DBSSchema["users"],
  chat_id: number,
  dbs: DBS,
  serverName: string,
  toolName: string,
  toolArguments?: Record<string, unknown>,
): Promise<McpToolCallResponse> => {
  const start = new Date();
  const result = await tryCatchV2(async () => {
    if (typeof serverName !== "string") throw new Error("Invalid serverName");
    if (typeof toolName !== "string") throw new Error("Invalid toolName");
    if (!Number.isInteger(chat_id)) throw new Error("Invalid chat_id");
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
    if (
      chatAllowedMCPTool.allowed_inputs?.length &&
      !chatAllowedMCPTool.allowed_inputs.some((allowedArgs) =>
        isEqual(allowedArgs, toolArguments),
      )
    ) {
      throw new Error("Invalid/dissalowed arguments");
    }
    const mcpHub = await startMcpHub(dbs);
    const res = await mcpHub.callTool(serverName, toolName, toolArguments);
    return res;
  });

  await dbs.mcp_server_tool_calls.insert({
    duration: { milliseconds: result.duration },
    called: start,
    mcp_server_name: serverName,
    mcp_tool_name: toolName,
    input: toolArguments,
    output: result.data,
    error: getErrorAsObject(result.error) || null,
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
