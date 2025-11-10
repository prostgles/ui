import {
  getJSONBObjectSchemaValidationError,
  getSerialisableError,
} from "prostgles-types";
import {
  getMCPToolNameParts,
  PROSTGLES_MCP_SERVERS_AND_TOOLS,
} from "@common/prostglesMcp";
import type { DBSSchema } from "@common/publishUtils";
import { callMCPServerTool } from "../../../McpHub/callMCPServerTool";
import { askLLM, type AskLLMArgs, type LLMMessage } from "../askLLM";
import {
  getAllToolNames,
  type getLLMToolsAllowedInThisChat,
  type MCPToolSchemaWithApproveInfo,
} from "../getLLMToolsAllowedInThisChat";
import {
  getClientDBHandlersForChat,
  runProstglesDBTool,
} from "../prostglesLLMTools/runProstglesDBTool";
import { validateLastMessageToolUseRequests } from "./validateLastMessageToolUseRequests";

export type ToolUseMessage = Extract<LLMMessage[number], { type: "tool_use" }>;
type ToolUseMessageWithInfo =
  | (ToolUseMessage & {
      tool: MCPToolSchemaWithApproveInfo;
      state: "approved";
    })
  | (ToolUseMessage & {
      tool: MCPToolSchemaWithApproveInfo;
      state: "needs-approval";
    })
  | (ToolUseMessage & {
      tool: MCPToolSchemaWithApproveInfo;
      state: "denied";
    })
  | (ToolUseMessage & {
      tool: undefined;
      state: "tool-missing";
    });
type ToolResultMessage = Extract<LLMMessage[number], { type: "tool_result" }>;

export const runApprovedTools = async (
  allowedTools: Awaited<ReturnType<typeof getLLMToolsAllowedInThisChat>>,
  args: Omit<AskLLMArgs, "userMessage" | "type">,
  chat: DBSSchema["llm_chats"],
  toolUseRequestMessages: ToolUseMessage[],
  userApprovals: LLMMessage | undefined,
  aborter: AbortController,
) => {
  const { user, chatId, dbs } = args;
  if (!toolUseRequestMessages.length) {
    return;
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
        tool.auto_approve || tool.type === "prostgles-ui" || wasApprovedByUser ?
          "approved"
        : userApprovals ? "denied"
        : "needs-approval",
    } satisfies ToolUseMessageWithInfo;
  });

  /** Wait for user to approve/deny all pending requests */
  if (toolUseRequests.some((tr) => tr.state === "needs-approval")) {
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

      if (toolUseRequest.state === "denied") {
        return asResponse(
          `Tool use request for "${toolUseRequest.name}" was denied by user`,
          true,
        );
      }

      if (tool.type === "prostgles-ui") {
        if (tool.tool_name === "suggest_tools_and_prompt") {
          const validation = getJSONBObjectSchemaValidationError(
            PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"][
              "suggest_tools_and_prompt"
            ].schema.type,
            toolUseRequest.input,
            "",
          );
          if (validation.error !== undefined) {
            return asResponse(
              `Input validation error: ${validation.error}`,
              true,
            );
          }
        }
        return asResponse("Done");
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
        const { content, isError } = await callMCPServerTool(
          user,
          chatId,
          dbs,
          serverName,
          toolName,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          toolUseRequest.input,
        ).catch((e) => ({
          content: e instanceof Error ? e.message : JSON.stringify(e),
          isError: true,
        }));

        return asResponse(content, isError);
      }

      const { clientMethods } = await getClientDBHandlersForChat(
        chat,
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
            const methodFunc =
              typeof method === "function" ? method : method.run;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const res = await methodFunc(toolUseRequest.input);
            return JSON.stringify(res ?? "");
          },
        );
        return asResponse(content, is_error);
      }

      if (tool.type !== "prostgles-db") {
        return asResponse(
          `Tool name "${toolUseRequest.name}" is invalid`,
          true,
        );
      }

      const { content, is_error } = await parseToolResultToMessage(async () => {
        const result = await runProstglesDBTool(
          chat,
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
