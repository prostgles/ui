import type { MethodHandler } from "prostgles-client/dist/prostgles";
import { usePromise } from "prostgles-client/dist/react-hooks";
import { useRef } from "react";
import {
  getLLMMessageToolUse,
  type LLMMessage,
} from "../../../../commonTypes/llmUtils";
import { getMCPToolNameParts } from "../../../../commonTypes/mcp";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import type { Prgl } from "../../App";
import type { DBSMethods } from "../Dashboard/DBS";
import { getErrorMessage } from "../../components/ErrorComponent";

type Args = {
  messages: DBSSchema["llm_messages"][];
  sendQuery: (
    msg: DBSSchema["llm_messages"]["message"] | undefined,
  ) => Promise<void>;
  callMCPServerTool: Prgl["dbsMethods"]["callMCPServerTool"];
} & Pick<Prgl, "methods">;

/**
 * https://docs.anthropic.com/en/docs/build-with-claude/tool-use
 */
export const useLLMTools = ({
  messages,
  methods,
  sendQuery,
  callMCPServerTool,
}: Args) => {
  const fetchingForMessageId = useRef<string>();
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
  }, [messages, methods, sendQuery, callMCPServerTool]);
};

const reachedMaximumNumberOfConsecutiveToolRequests = (
  messages: Args["messages"],
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
