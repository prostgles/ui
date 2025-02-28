import { usePromise } from "prostgles-client/dist/react-hooks";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import {
  getLLMMessageToolUse,
  type LLMMessage,
} from "../../../../commonTypes/llmUtils";
import type { Prgl } from "../../App";
import { useRef } from "react";
import type { MethodHandler } from "prostgles-client/dist/prostgles";
import type { DBSMethods } from "../Dashboard/DBS";

/**
 * https://docs.anthropic.com/en/docs/build-with-claude/tool-use
 */
export const useLLMTools = ({
  messages,
  methods,
  sendQuery,
  callMCPServerTool,
}: {
  messages: DBSSchema["llm_messages"][];
  sendQuery: (
    msg: DBSSchema["llm_messages"]["message"] | undefined,
  ) => Promise<void>;
  callMCPServerTool: Prgl["dbsMethods"]["callMCPServerTool"];
} & Pick<Prgl, "methods">) => {
  const fetchingForMessageId = useRef<string>();
  usePromise(async () => {
    const lastMessage2 = messages.at(-3);
    const lastMessage = messages.at(-1);
    if (!isAssistantMessageRequestingToolUse(lastMessage)) return;
    if (
      fetchingForMessageId.current &&
      fetchingForMessageId.current === lastMessage.id
    )
      return;
    /** Prevent buggy recursions */
    if (isAssistantMessageRequestingToolUse(lastMessage2)) return;
    const toolUse = getLLMMessageToolUse(lastMessage);
    fetchingForMessageId.current = lastMessage.id;
    const results = await Promise.all(
      toolUse.map(async (tu) => {
        const toolResult = await getToolUseResult(
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

const getToolUseResult = async (
  methods: MethodHandler,
  callMCPServerTool: DBSMethods["callMCPServerTool"],
  funcName: string,
  input: any,
): Promise<{ content: string; is_error?: true }> => {
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
    if (funcName.includes(".")) {
      if (!callMCPServerTool) {
        return {
          content: "callMCPServerTool not allowed",
          is_error: true,
        };
      }
      const [serverName, toolName] = funcName.split("____");
      if (!serverName || !toolName) {
        return {
          content: "Invalid serverName or toolName",
          is_error: true,
        };
      }
      const result = parseResult(
        callMCPServerTool(serverName, toolName, input),
      );
      return result;
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
