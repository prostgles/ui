import {
  getMCPToolNameParts,
  type AllowedChatTool,
} from "@common/prostglesMcp";
import type { DBSSchema } from "@common/publishUtils";
import type { AuthClientRequest } from "prostgles-server/dist/Auth/AuthTypes";
import { getSerialisableError } from "prostgles-types";
import { callMCPServerTool } from "../../../McpHub/callMCPServerTool";
import { AGENT_GOAL_TOOL_NAMES } from "../agentConstants";
import { askLLM, type AskLLMArgs, type LLMMessage } from "../askLLM";
import {
  getAllToolNames,
  type getLLMToolsAllowedInThisChat,
} from "../getLLMToolsAllowedInThisChat";
import {
  getClientDBHandlersForChat,
  runProstglesDBTool,
} from "../prostglesLLMTools/runProstglesDBTool";
import { runAgentGoalTool } from "./runAgentGoalTool";
import { validateLastMessageToolUseRequests } from "./validateLastMessageToolUseRequests";

export type ToolUseMessage = Extract<LLMMessage[number], { type: "tool_use" }>;
type ToolUseMessageWithInfo =
  | (ToolUseMessage & {
      tool: AllowedChatTool;
      state: "approved";
    })
  | (ToolUseMessage & {
      tool: AllowedChatTool;
      state: "needs-approval";
    })
  | (ToolUseMessage & {
      tool: AllowedChatTool;
      state: "denied";
    })
  | (ToolUseMessage & {
      tool: undefined;
      state: "tool-missing";
    });
export type ToolResultMessage = Extract<
  LLMMessage[number],
  { type: "tool_result" }
>;

export const runApprovedTools = async (
  allowedTools: Awaited<ReturnType<typeof getLLMToolsAllowedInThisChat>>,
  args: Omit<AskLLMArgs, "userMessage" | "type">,
  chat: DBSSchema["llm_chats"],
  toolUseRequestMessages: ToolUseMessage[],
  userApprovals: LLMMessage | undefined,
  aborter: AbortController,
  clientReq: AuthClientRequest,
) => {
  const { user, chatId, dbs } = args;
  if (!toolUseRequestMessages.length) {
    return;
  }
  if (chatId !== chat.id) {
    throw new Error(`Chat id mismatch. Expected ${chatId} but got ${chat.id}`);
  }
  const { connection_id, db_data_permissions } = chat;
  if (!connection_id) {
    throw new Error(`Chat with id ${chatId} does not have a connection_id`);
  }
  const dbPermissions = {
    connection_id,
    db_data_permissions,
  };

  /**
   * Here we expect the user to return a list of approved tools. Anything not in this list that is not auto-approved means denied.
   */
  if (userApprovals) {
    validateLastMessageToolUseRequests({
      toolUseMessages: toolUseRequestMessages,
      userToolUseApprovals: userApprovals,
    });
  }

  const agetGoalTool = toolUseRequestMessages.find((m) =>
    [AGENT_GOAL_TOOL_NAMES.REACHED, AGENT_GOAL_TOOL_NAMES.FAILED].includes(
      m.name,
    ),
  );
  if (agetGoalTool) {
    return runAgentGoalTool({
      chat,
      agetGoalTool,
      dbs,
      aborter,
      args,
      toolUseRequestMessages,
    });
  }

  const toolUseRequests = toolUseRequestMessages.map((toolUse) => {
    const tool = allowedTools?.find((t) => t.name === toolUse.name);
    if (!tool) {
      return {
        ...toolUse,
        tool: undefined,
        state: "tool-missing",
      } satisfies ToolUseMessageWithInfo;
    }
    const wasApprovedByUser = userApprovals?.some(
      (m) =>
        m.type === "tool_use" && m.id === toolUse.id && m.name === toolUse.name,
    );
    return {
      ...toolUse,
      tool,
      state:
        (
          tool.auto_approve ||
          tool.mode === "auto-approved-user-actionable" ||
          wasApprovedByUser
        ) ?
          "approved"
        : userApprovals ? "denied"
        : "needs-approval",
    } satisfies ToolUseMessageWithInfo;
  });

  /** Wait for user to approve/deny/respond to all pending requests */
  if (
    toolUseRequests.some(
      (tr) =>
        tr.state === "needs-approval" ||
        tr.tool?.mode === "user-provides-response",
    )
  ) {
    return;
  }

  const toolResults: ToolResultMessage[] = await Promise.all(
    toolUseRequests.map(async (toolUseRequest) => {
      const toolUseInfo = {
        type: "tool_result",
        tool_use_id: toolUseRequest.id,
        tool_name: toolUseRequest.name,
      } as const;
      const asResponse = (
        content: ToolResultMessage["content"],
        is_error = false,
      ) => {
        return {
          ...toolUseInfo,
          content,
          is_error,
        } satisfies ToolResultMessage;
      };
      const tool = toolUseRequest.tool;
      if (!tool) {
        const allToolNames = await getAllToolNames(dbs);
        const { serverName } = getMCPToolNameParts(toolUseRequest.name) ?? {};
        const matchedTool = allToolNames.includes(toolUseRequest.name);
        const matchedMCPServer =
          matchedTool || !serverName ? undefined : (
            await dbs.mcp_servers.findOne({
              name: serverName,
            })
          );
        return asResponse(
          `Tool name "${toolUseRequest.name}" ${
            matchedTool ?
              "is not allowed. Must enable it for this chat"
            : "is invalid." +
              (matchedMCPServer ?
                ` Try enabling and reloading the tools for ${JSON.stringify(serverName)} MCP Server`
              : "")
          }`,
          true,
        );
      }

      if (
        toolUseRequest.tool.mode === "user-provides-response" &&
        toolUseRequests.length > 1
      ) {
        return asResponse(
          `Tool use request for "${toolUseRequest.name}" is invalid. This tool cannot be used together with other tools. Please use it in a single tool use request and try again.`,
          true,
        );
      }

      if (toolUseRequest.state === "denied") {
        return asResponse(
          `Tool use request for "${toolUseRequest.name}" was denied by user`,
          true,
        );
      }

      if (aborter.signal.aborted) {
        return asResponse(`Operation was aborted by user.`, true);
      }
      if (tool.type === "mcp") {
        const toolNameParts = getMCPToolNameParts(toolUseRequest.name);
        if (!toolNameParts) {
          return asResponse(
            `Tool name "${toolUseRequest.name}" is invalid`,
            true,
          );
        }
        const { serverName, toolName } = toolNameParts;
        const { content, isError } = await callMCPServerTool({
          user,
          chat_id: chatId,
          dbs,
          serverName,
          toolName,
          toolArguments: toolUseRequest.input,
          clientReq,
          toolUseId: toolUseRequest.id,
        }).catch((e) => ({
          content: e instanceof Error ? e.message : JSON.stringify(e),
          isError: true,
        }));

        return asResponse(content, isError);
      }

      const { clientMethods } = await getClientDBHandlersForChat(
        dbPermissions,
        args.clientReq,
      );
      if (tool.type === "prostgles-db-methods") {
        const { content, is_error } = await parseToolResultToMessage(
          async () => {
            const method = clientMethods[tool.tool_name];
            if (!method) {
              throw new Error(
                `Invalid or disallowed method: "${tool.tool_name}"`,
              );
            }
            const methodFunc = method.run!;
            const res = await methodFunc(toolUseRequest.input);
            return JSON.stringify(res ?? "");
          },
        );
        return asResponse(content, is_error);
      }

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (tool.type !== "prostgles-db") {
        return asResponse(
          `Tool name "${toolUseRequest.name}" is invalid`,
          true,
        );
      }

      const { content, is_error } = await parseToolResultToMessage(async () => {
        const result = await runProstglesDBTool(
          dbPermissions,
          args.clientReq,
          toolUseRequest.input,
          tool.tool_name,
        );

        return typeof result === "string" ? result : JSON.stringify(result);
      });
      return asResponse(content, is_error);
    }),
  );

  const denied = toolUseRequests.some((tr) => tr.state === "denied");
  if (toolResults.length) {
    await askLLM({
      ...args,
      type: denied ? "tool-use-result-with-denied" : "tool-use-result",
      userMessage: toolResults,
      aborter,
    });
  }
};

const parseToolResultToMessage = (
  func: () => Promise<string | undefined>,
): Promise<
  | { content: string; is_error?: undefined }
  | { content: string; is_error: boolean }
> => {
  return func()
    .then((content: string | undefined) => ({ content: content ?? "" }))
    .catch((e) => ({
      content: JSON.stringify(getSerialisableError(e)),
      is_error: true as const,
    }));
};
