import { getMCPFullToolName } from "@common/prostglesMcp";
import type { DBSSchema } from "@common/publishUtils";
import {
  getMcpHostInfo,
  getMCPServersStatus,
  installMCPServer,
} from "@src/McpHub/AnthropicMcpHub/installMCPServer";
import { callMCPServerTool } from "@src/McpHub/callMCPServerTool";
import { reloadMcpServerTools } from "@src/McpHub/reloadMcpServerTools";
import type { getServerFunctionsContext } from "../getServerFunctionsContext";
import { getDefineAdminFunction } from "./getDefineAdminFunction";
export const getMcpServerFunctions = (
  context: Awaited<ReturnType<typeof getServerFunctionsContext>>,
) => {
  const { defineAdminFunction } = getDefineAdminFunction(context);

  return {
    installMCPServer: defineAdminFunction({
      input: { name: "string" },
      run: async ({ name }, { dbs }) => {
        return installMCPServer(dbs, name);
      },
    }),
    getMCPServersStatus: defineAdminFunction({
      input: { serverName: "string" },
      run: ({ serverName }, { dbs }) => getMCPServersStatus(dbs, serverName),
    }),
    callMCPServerTool: defineAdminFunction({
      input: {
        chatId: "integer",
        serverName: "string",
        toolName: "string",
        reRunToolUseId: {
          type: "string",
          optional: true,
        },
        args: { record: {}, optional: true },
      },
      run: async (
        { chatId, serverName, toolName, args, reRunToolUseId },
        { dbs, user, clientReq },
      ) => {
        const name = getMCPFullToolName(serverName, toolName);
        let reRunInfo:
          | {
              reRunResultMessageIndex: number;
              reRunResultMessage: DBSSchema["llm_messages"];
              reRunToolUseMessageIndex: number;
              reRunToolUseMessage: DBSSchema["llm_messages"];
            }
          | undefined = undefined;
        const chat = await dbs.llm_chats.findOne({
          id: chatId,
          user_id: user.id,
        });
        if (!chat) {
          throw new Error(
            `Chat with id ${chatId} not found for user ${user.id}`,
          );
        }
        if (reRunToolUseId) {
          const reRunToolUseMessage = await dbs.llm_messages.findOne({
            chat_id: chatId,
            message: {
              "@>": [{ type: "tool_use", id: reRunToolUseId, name }],
            },
          });
          if (!reRunToolUseMessage) {
            throw new Error(
              `Tool use with id ${reRunToolUseId} not found for chat ${chatId}`,
            );
          }

          const reRunResultMessage = await dbs.llm_messages.findOne({
            chat_id: chatId,
            message: {
              "@>": [
                {
                  type: "tool_result",
                  tool_use_id: reRunToolUseId,
                  tool_name: name,
                } as any,
              ],
            },
          });
          if (!reRunResultMessage) {
            throw new Error(
              `Tool result for tool use id ${reRunToolUseId} not found for chat ${chatId}`,
            );
          }

          const reRunToolUseMessageIndex =
            reRunToolUseMessage.message.findIndex(
              (m) =>
                m.type === "tool_use" &&
                m.id === reRunToolUseId &&
                m.name === name,
            );
          const reRunResultMessageIndex = reRunResultMessage.message.findIndex(
            (m) =>
              m.type === "tool_result" &&
              m.tool_use_id === reRunToolUseId &&
              m.tool_name === name,
          );

          if (
            reRunToolUseMessageIndex === -1 ||
            reRunResultMessageIndex === -1
          ) {
            throw new Error(
              `Could not find tool use or result message for tool use id ${reRunToolUseId} in chat ${chatId}`,
            );
          }

          reRunInfo = {
            reRunToolUseMessageIndex,
            reRunToolUseMessage,
            reRunResultMessageIndex,
            reRunResultMessage,
          };
        }
        const result = await callMCPServerTool({
          user,
          chat_id: chatId,
          dbs,
          serverName,
          toolName,
          toolArguments: args,
          clientReq,
        });

        if (reRunInfo) {
          const { content } = result;
          await dbs.llm_messages.update(
            {
              id: reRunInfo.reRunResultMessage.id,
            },
            {
              message: reRunInfo.reRunResultMessage.message.map((m, i) => {
                if (i === reRunInfo.reRunResultMessageIndex) {
                  return {
                    type: "tool_result",
                    content: content as unknown as {
                      type: "text";
                      text: string;
                    }[],
                    tool_name: name,
                    tool_use_id: reRunToolUseId!,
                    is_error: result.isError,
                  } as const;
                }
                return m;
              }),
            },
          );
          await dbs.llm_messages.update(
            {
              id: reRunInfo.reRunToolUseMessage.id,
            },
            {
              message: reRunInfo.reRunToolUseMessage.message.map((m, i) => {
                if (i === reRunInfo.reRunToolUseMessageIndex) {
                  return {
                    type: "tool_use",
                    id: reRunToolUseId!,
                    name,
                    input: args,
                  } as const satisfies DBSSchema["llm_messages"]["message"][number];
                }
                return m;
              }),
            },
          );
        }
        return result;
      },
    }),
    reloadMcpServerTools: defineAdminFunction({
      input: { serverName: "string" },
      run: async ({ serverName }, { dbs }) =>
        reloadMcpServerTools(dbs, serverName),
    }),
    getMcpHostInfo: defineAdminFunction({
      run: () => getMcpHostInfo(),
    }),
    transcribeAudio: defineAdminFunction({
      input: { audioBlob: "Blob" },
      run: async ({ audioBlob }, { servicesManager }) => {
        const speechToTextService = servicesManager.getService("speechToText");
        if (speechToTextService?.status !== "running") {
          throw "Speech to Text service is not enabled/running";
        }
        const formData = new FormData();
        const audioBlobWithMime = new Blob([audioBlob], { type: "audio/webm" });

        formData.append("audio", audioBlobWithMime, "recording.webm");
        const result =
          await speechToTextService.endpoints["/transcribe"](formData);

        return result;
      },
    }),
  };
};
