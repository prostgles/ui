import {
  getJSONBObjectSchemaValidationError,
  getSerialisableError,
  tryCatchV2,
} from "prostgles-types";
import type { DBS } from "..";
import type { McpToolCallResponse } from "../../../commonTypes/mcp";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import { startMcpHub } from "./McpHub";
import { ProstglesLocalMCPServers } from "./DefaultMCPServers/DefaultMCPServers";
import { getDockerMCP } from "../DockerManager/getDockerMCP";

export const callMCPServerTool = async (
  user: Pick<DBSSchema["users"], "id">,
  chat_id: number,
  dbs: DBS,
  serverName: string,
  toolName: string,
  toolArguments: Record<string, unknown> | undefined,
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
    "",
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

    if (ProstglesLocalMCPServers.includes(serverName)) {
      if (serverName === "docker-sandbox") {
        const dockerMCP = await getDockerMCP(dbs, chat);
        if (toolName === "create_container") {
          const result = await dockerMCP.tools.createContainer(toolArguments, {
            chatId: chat.id,
            userId: user.id,
          });
          return result;
        }
        throw new Error(
          `MCP server ${serverName}.${toolName} not implemented for tool ${toolName}`,
        );
      }
      throw new Error(
        `MCP server ${serverName} ProstglesLocalMCPServers not implemented`,
      );
    }
    // if (
    //   chatAllowedMCPTool.allowed_inputs?.length &&
    //   !chatAllowedMCPTool.allowed_inputs.some((allowedArgs) =>
    //     isEqual(allowedArgs, toolArguments),
    //   )
    // ) {
    //   throw new Error("Invalid/dissalowed arguments");
    // }
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
