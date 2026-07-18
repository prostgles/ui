import { documentsServiceInputSchema } from "@common/mcp/documentsServiceInputSchema";
import { getMCPFullToolName } from "@common/mcpUtils";
import type { DBSSchema } from "@common/publishUtils";
import {
  getMcpHostInfo,
  getMCPServersStatus,
  installMCPServer,
} from "@src/McpHub/AnthropicMcpHub/installMCPServer";
import { authenticateMcpServer } from "@src/McpHub/AnthropicMcpHub/McpOAuth/authenticateMcpServer";
import { callMCPServerTool } from "@src/McpHub/callMCPServerTool";
import { getRunTypescriptInNodejsFiles } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Ui.mcp";
import { reloadMcpServerTools } from "@src/McpHub/reloadMcpServerTools";
import { CONVERT_DOCUMENT_DEFAULT_OPTIONS } from "@src/ServiceManager/services/documents/documents.service";
import type { getServerFunctionsContext } from "../getServerFunctionsContext";
import { getDefineAdminFunction } from "./getDefineAdminFunction";
import { getMcpOAuthMetadata } from "@src/McpHub/AnthropicMcpHub/McpOAuth/getMcpOAuthMetadata";
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

    authenticateMcpServer: defineAdminFunction({
      input: {
        serverName: "string",
        origin: "string",
        scopes: "string[]",
        clientMetadataUrl: { type: "string", optional: true },
        authMode: { enum: ["dcr", "cimd"] as const },
      },
      run: async (
        { serverName, origin, scopes, clientMetadataUrl, authMode },
        { dbs },
      ) => {
        return authenticateMcpServer(
          { serverName, origin, scopes, clientMetadataUrl, authMode },
          dbs,
        );
      },
    }),
    getMcpOAuthMetadata: defineAdminFunction({
      input: {
        serverName: "string",
      },
      run: async ({ serverName }, { dbs }) => {
        const server = await dbs.mcp_servers.findOne({ name: serverName });
        if (!server) {
          throw new Error(`MCP server "${serverName}" not found`);
        }
        const { command, url } = server;
        if (command !== "streamable-http") {
          throw new Error(
            `MCP server "${serverName}" has command "${command}", expected "streamable-http"`,
          );
        }
        if (!url) {
          throw new Error(`MCP server "${serverName}" has no URL`);
        }

        return getMcpOAuthMetadata(url);
      },
    }),
    reRunMCPServerTool: defineAdminFunction({
      input: {
        chatId: "integer",
        serverName: "string",
        toolName: "string",
        reRunToolUseId: "string",
        args: { record: {}, optional: true },
      },
      run: async (
        { chatId, serverName, toolName, args, reRunToolUseId },
        { dbs, user, clientReq },
      ) => {
        const name = getMCPFullToolName(serverName, toolName);

        const chat = await dbs.llm_chats.findOne({
          id: chatId,
          user_id: user.id,
        });
        if (!chat) {
          throw new Error(
            `Chat with id ${chatId} not found for user ${user.id}`,
          );
        }
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

        const reRunToolUseMessageIndex = reRunToolUseMessage.message.findIndex(
          (m) =>
            m.type === "tool_use" && m.id === reRunToolUseId && m.name === name,
        );
        const reRunResultMessageIndex = reRunResultMessage.message.findIndex(
          (m) =>
            m.type === "tool_result" &&
            m.tool_use_id === reRunToolUseId &&
            m.tool_name === name,
        );

        if (reRunToolUseMessageIndex === -1 || reRunResultMessageIndex === -1) {
          throw new Error(
            `Could not find tool use or result message for tool use id ${reRunToolUseId} in chat ${chatId}`,
          );
        }

        const reRunInfo = {
          reRunToolUseMessageIndex,
          reRunToolUseMessage,
          reRunResultMessageIndex,
          reRunResultMessage,
        };
        const result = await callMCPServerTool({
          user,
          chat_id: chatId,
          dbs,
          serverName,
          toolName,
          toolArguments: args,
          clientReq,
          toolUseId: reRunToolUseId,
          isReRun: Boolean(reRunToolUseId),
          mcp_tool_approval_requests_id: undefined,
          messageId: reRunInfo.reRunToolUseMessage.id,
        });

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
                  tool_use_id: reRunToolUseId,
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
                  id: reRunToolUseId,
                  name,
                  input: args,
                } as const satisfies DBSSchema["llm_messages"]["message"][number];
              }
              return m;
            }),
          },
        );
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
    getDocumentText: defineAdminFunction({
      input: {
        files: {
          arrayOf: {
            type: "FileLike",
            // mimeTypes: { "application/pdf": 1 },
          },
        },
        options: documentsServiceInputSchema,
      },
      run: async ({ files, options }, { servicesManager }) => {
        const docService = servicesManager.getService("documents");
        if (docService?.status !== "running") {
          throw "Document service is not enabled/running";
        }

        const result = await docService.endpoints["/v1/convert/file"]({
          files: files.map(
            ({ data }) => new Blob([data], { type: "application/pdf" }),
          ),
          ...CONVERT_DOCUMENT_DEFAULT_OPTIONS,
          ...options,
        });
        return result;
      },
    }),
    transcribeAudio: defineAdminFunction({
      input: { audio: { type: "FileLike", mimeTypes: { "audio/webm": 1 } } },
      run: async ({ audio }, { servicesManager }) => {
        const speechToTextService = servicesManager.getService("speechToText");
        if (speechToTextService?.status !== "running") {
          throw "Speech to Text service is not enabled/running";
        }
        const audioBlobWithMime = new Blob([audio.data], {
          type: "audio/webm",
        });

        const result = await speechToTextService.endpoints["/transcribe"]({
          audio: audioBlobWithMime,
        });

        return result;
      },
    }),
    getRunTypescriptInNodejsFiles: defineAdminFunction({
      input: {
        entrypointTs: "string",
        packageDependencies: { record: { values: "string" } },
      },
      run: ({ entrypointTs, packageDependencies }) => {
        return getRunTypescriptInNodejsFiles(entrypointTs, packageDependencies);
      },
    }),
  };
};

const extractAuthorizationCode = (
  callbackUrl: string | undefined,
): string | undefined => {
  if (!callbackUrl) return undefined;
  try {
    const parsed = new URL(callbackUrl);
    return parsed.searchParams.get("code") ?? undefined;
  } catch {
    return undefined;
  }
};

const extractFirstUrl = (text: string): string | undefined => {
  const match = text.match(/https?:\/\/[^\s"')]+/);
  return match?.[0];
};
