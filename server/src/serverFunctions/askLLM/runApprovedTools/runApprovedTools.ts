import {
  getMCPFullToolName,
  getMCPToolNameParts,
  getProstglesMCPFullToolName,
  type AllowedChatTool,
} from "@common/mcpUtils";
import type { DBSSchema } from "@common/publishUtils";
import { getProstglesMcpHub } from "@src/McpHub/ProstglesMcpHub/ProstglesMcpHub";
import type { AuthClientRequest } from "prostgles-server/dist/Auth/AuthTypes";
import { getSerialisableError } from "prostgles-types";
import { callMCPServerTool } from "../../../McpHub/callMCPServerTool";
import { AGENT_GOAL_TOOL_NAMES } from "../agentConstants";
import { askLLM, type AskLLMArgs, type LLMMessage } from "../askLLM";
import {
  getAllToolNames,
  type getLLMToolsAllowedInThisChat,
} from "../getLLMToolsAllowedInThisChat";
import { getMostSimilar } from "./getMostSimilar";
import { runAgentGoalTool } from "./runAgentGoalTool";
import { validateLastMessageToolUseRequests } from "./validateLastMessageToolUseRequests";

export type ToolUseMessage = Extract<LLMMessage[number], { type: "tool_use" }>;
type ToolUseMessageWithInfo =
  | (ToolUseMessage & {
      tool: AllowedChatTool;
      userApprovalResponse: DBSSchema["mcp_tool_approval_requests"] | undefined;
      state: "approved" | "user-provides-response";
    })
  | (ToolUseMessage & {
      tool: AllowedChatTool;
      userApprovalResponse: DBSSchema["mcp_tool_approval_requests"] | undefined;
      state: "needs-approval";
    })
  | (ToolUseMessage & {
      tool: AllowedChatTool;
      userApprovalResponse: DBSSchema["mcp_tool_approval_requests"] | undefined;
      state: "denied";
    })
  | (ToolUseMessage & {
      tool: undefined;
      userApprovalResponse: DBSSchema["mcp_tool_approval_requests"] | undefined;
      state: "tool-missing";
    })
  | (ToolUseMessage & {
      tool: AllowedChatTool;
      userApprovalResponse: DBSSchema["mcp_tool_approval_requests"] | undefined;
      state: "input-validation-error";
      inputValidationError: string;
    });

export type ToolResultMessage = Extract<
  LLMMessage[number],
  { type: "tool_result" }
>;

export const runApprovedTools = async ({
  allowedTools,
  aborter,
  args,
  chat,
  toolUseRequestMessages,
  userApprovals,
  clientReq,
  messageId,
}: {
  allowedTools: Awaited<ReturnType<typeof getLLMToolsAllowedInThisChat>>;
  args: Omit<AskLLMArgs, "userMessage" | "type" | "aborter">;
  chat: DBSSchema["llm_chats"];
  toolUseRequestMessages: ToolUseMessage[];
  userApprovals: DBSSchema["mcp_tool_approval_requests"][] | undefined;
  aborter: AbortController;
  clientReq: AuthClientRequest;
  messageId: DBSSchema["llm_messages"]["id"];
}) => {
  const { user, chatId, dbs } = args;
  if (!toolUseRequestMessages.length) {
    return;
  }
  if (chatId !== chat.id) {
    throw new Error(`Chat id mismatch. Expected ${chatId} but got ${chat.id}`);
  }
  const { connection_id } = chat;
  if (!connection_id) {
    throw new Error(`Chat with id ${chatId} does not have a connection_id`);
  }

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

  const prglMcpHub = await getProstglesMcpHub(dbs);
  const toolUseRequests = toolUseRequestMessages.map((toolUse) => {
    const tool = allowedTools?.find((t) => t.name === toolUse.name);
    if (!tool) {
      return {
        ...toolUse,
        tool: undefined,
        userApprovalResponse: undefined,
        state: "tool-missing",
      } satisfies ToolUseMessageWithInfo;
    }
    const userApprovalResponse = userApprovals?.find(
      ({ tool_use_id, server_name, tool_name }) =>
        tool_use_id === toolUse.id &&
        toolUse.name === getMCPFullToolName(server_name, tool_name),
    );

    let inputValidationError: string | undefined = undefined;
    try {
      if (
        getProstglesMCPFullToolName("prostgles-ui", "ask_user_questions") ===
        toolUse.name
      ) {
        prglMcpHub.validateToolInput(
          tool.server_name,
          tool.tool_name,
          toolUse.input,
        );
      }
    } catch (e) {
      inputValidationError = JSON.stringify(getSerialisableError(e));
    }

    if (inputValidationError) {
      return {
        ...toolUse,
        userApprovalResponse,
        tool,
        inputValidationError,
        state: "input-validation-error",
      } satisfies ToolUseMessageWithInfo;
    }

    return {
      ...toolUse,
      userApprovalResponse,
      tool,
      state:
        (
          tool.auto_approve ||
          tool.mode === "auto-approved-user-actionable" ||
          userApprovalResponse?.response === "approve" ||
          userApprovalResponse?.response === "auto-approve"
        ) ?
          "approved"
        : tool.mode === "user-provides-response" ? "user-provides-response"
        : userApprovals ? "denied"
        : "needs-approval",
    } satisfies ToolUseMessageWithInfo;
  });

  if (toolUseRequests.some((r) => r.state === "input-validation-error")) {
    await askLLM({
      ...args,
      type: "tool-use-result",
      userMessage: toolUseRequests.map((r) => {
        return {
          type: "tool_result",
          is_error: true,
          tool_name: r.name,
          tool_use_id: r.id,
          content: [
            {
              type: "text",
              text:
                r.state === "input-validation-error" ?
                  r.inputValidationError
                : `Tool request aborted.`,
            },
          ],
        };
      }),
      aborter,
    });
    return;
  }

  /** Wait for user to approve/deny/respond to all pending requests */
  if (
    toolUseRequests.some(
      ({ state }) =>
        state === "needs-approval" || state === "user-provides-response",
    )
  ) {
    const requestsThatNeedApproval = toolUseRequests.filter(
      (tr) => tr.state === "needs-approval",
    );
    for (const toolUseRequest of requestsThatNeedApproval) {
      const toolNameParts = getMCPToolNameParts(toolUseRequest.name);
      if (!toolNameParts) {
        throw new Error(`Invalid tool name ${toolUseRequest.name}`);
      }
      const { serverName, toolName } = toolNameParts;
      await dbs.mcp_tool_approval_requests.insert({
        chat_id: chatId,
        tool_use_id: toolUseRequest.id,
        tool_name: toolName,
        input: toolUseRequest.input ?? {},
        server_name: serverName,
        user_id: user.id,
        message_id: messageId,
        connection_id,
        source: {
          type: "chat",
          responseCount: requestsThatNeedApproval.length,
        },
      });
    }
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
        const errorHint = (() => {
          if (matchedTool) {
            return "is not allowed. Must enable it for this chat";
          }

          const mostSimilar = getMostSimilar(toolUseRequest.name, allToolNames);
          return (
            `is invalid.` +
            (matchedMCPServer ?
              ` Try enabling and reloading the tools for ${JSON.stringify(serverName)} MCP Server`
            : mostSimilar ? ` Did you mean ${JSON.stringify(mostSimilar)} ?`
            : ` Valid tool names: ${allToolNames}`)
          );
        })();
        return asResponse(
          `Tool name "${toolUseRequest.name}" ${errorHint}`,
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
        mcp_tool_approval_requests_id: toolUseRequest.userApprovalResponse?.id,
        messageId,
      }).catch((e) => ({
        content: e instanceof Error ? e.message : JSON.stringify(e),
        isError: true,
      }));

      return asResponse(content, isError);
    }),
  );

  const denied = toolUseRequests.some(({ state }) => state === "denied");
  if (toolResults.length) {
    await askLLM({
      ...args,
      type: denied ? "tool-use-result-with-denied" : "tool-use-result",
      userMessage: toolResults,
      aborter,
    });
  }
};
