import type { MethodHandler } from "prostgles-client/dist/prostgles";
import { usePromise } from "prostgles-client/dist/react-hooks";
import { useRef } from "react";
import {
  getLLMMessageToolUse,
  type LLMMessage,
} from "../../../../../commonTypes/llmUtils";
import {
  getMCPFullToolName,
  getMCPToolNameParts,
} from "../../../../../commonTypes/mcp";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import type { DBSMethods } from "../../Dashboard/DBS";
import type { AskLLMToolsProps } from "./AskLLMTools";

/**
 * https://docs.anthropic.com/en/docs/build-with-claude/tool-use
 */
export const useLLMTools = ({
  dbs,
  activeChatId,
  messages,
  methods,
  sendQuery,
  callMCPServerTool,
  requestApproval,
}: AskLLMToolsProps & {
  requestApproval: (
    tool: DBSSchema["mcp_server_tools"],
    input: any,
  ) => Promise<{ approved: boolean }>;
}) => {
  const fetchingForMessageId = useRef<string>();
  const { data: allowedTools } = dbs.llm_chats_allowed_mcp_tools.useSubscribe(
    {
      chat_id: activeChatId,
    },
    { select: { "*": 1, mcp_server_tools: "*" } },
  );
  usePromise(async () => {
    const lastMessage = messages.at(-1);
    if (!isAssistantMessageRequestingToolUse(lastMessage)) return;
    if (reachedMaximumNumberOfConsecutiveToolRequests(messages, 4)) return;
    if (
      fetchingForMessageId.current &&
      fetchingForMessageId.current === lastMessage.id
    )
      return;
    const toolUse = getLLMMessageToolUse(lastMessage);
    fetchingForMessageId.current = lastMessage.id;
    const results = await Promise.all(
      toolUse.map(async (tu) => {
        const sendError = (error: string) => {
          return {
            type: "tool_result",
            tool_use_id: tu.id,
            is_error: true,
            content: error,
          } satisfies LLMMessage["message"][number];
        };

        const isAllowedWithoutApproval = allowedTools?.some((tool) => {
          return (
            tool.auto_approve &&
            tu.name === getMCPFullToolName(tool.mcp_server_tools[0])
          );
        });

        if (!isAllowedWithoutApproval) {
          const nameParts = getMCPToolNameParts(tu.name);
          if (!nameParts) {
            return sendError("Tool not found");
          }
          const tool = await dbs.mcp_server_tools.findOne({
            name: nameParts.toolName,
            server_name: nameParts.serverName,
          });
          if (!tool) {
            return sendError("Tool not found");
          }
          const { approved } = await requestApproval(tool, tu.input);

          if (!approved) {
            return sendError("Tool use not approved by user");
          }
        }

        const toolResult = await getToolUseResult(
          lastMessage.chat_id,
          methods,
          callMCPServerTool,
          tu.name,
          tu.input,
        );

        return {
          type: "tool_result",
          tool_use_id: tu.id,
          ...toolResult,
        } satisfies LLMMessage["message"][number];
      }),
    );
    await sendQuery(results);
  }, [
    messages,
    methods,
    sendQuery,
    callMCPServerTool,
    allowedTools,
    requestApproval,
    dbs,
  ]);
};

const reachedMaximumNumberOfConsecutiveToolRequests = (
  messages: AskLLMToolsProps["messages"],
  limit: number,
): boolean => {
  const count =
    messages
      .slice()
      .reverse()
      .findIndex((m, i, arr) => {
        return !(
          isAssistantMessageRequestingToolUse(m) &&
          isAssistantMessageRequestingToolUse(arr[i + 2])
        );
      }) + 1;
  if (count >= limit) return true;

  return false;
};

const getToolUseResult = async (
  chatId: number,
  methods: MethodHandler,
  callMCPServerTool: DBSMethods["callMCPServerTool"],
  funcName: string,
  input: any,
): Promise<{
  content: Extract<
    DBSSchema["llm_messages"]["message"][number],
    { type: "tool_result" }
  >["content"];
  is_error?: true;
}> => {
  const method = methods[funcName];
  const parseResult = (func: Promise<any>) => {
    return func
      .then((content: string) => ({ content }))
      .catch((e) => ({
        content: JSON.stringify(e),
        is_error: true as const,
      }));
  };
  if (!method) {
    const mcpToolName = getMCPToolNameParts(funcName);
    if (mcpToolName) {
      const { serverName, toolName } = mcpToolName;
      if (!callMCPServerTool) {
        return {
          content: "callMCPServerTool not allowed",
          is_error: true,
        };
      }
      if (!serverName || !toolName) {
        return {
          content: "Invalid serverName or toolName",
          is_error: true,
        };
      }

      const { content, isError } = await callMCPServerTool(
        chatId,
        serverName,
        toolName,
        input,
      ).catch((e) => ({
        content: e instanceof Error ? e.message : JSON.stringify(e),
        isError: true,
      }));

      return {
        content,
        ...(isError && {
          is_error: isError,
        }),
      };
    }

    return {
      content: "Method not found or not allowed",
      is_error: true,
    };
  }
  const methodFunc = typeof method === "function" ? method : method.run;
  const result = parseResult(methodFunc(input));
  return result;
};

const isAssistantMessageRequestingToolUse = (
  message: DBSSchema["llm_messages"] | undefined,
): message is DBSSchema["llm_messages"] => {
  return Boolean(message && getLLMMessageToolUse(message).length);
};
