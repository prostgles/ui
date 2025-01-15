import { usePromise } from "prostgles-client/dist/react-hooks";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import {
  getLLMMessageToolUse,
  type LLMMessage,
} from "../../../../commonTypes/llmUtils";
import type { Prgl } from "../../App";
import { useRef } from "react";

/**
 * https://docs.anthropic.com/en/docs/build-with-claude/tool-use
 */
export const useLLMTools = ({
  messages,
  methods,
  sendQuery,
}: {
  messages: DBSSchema["llm_messages"][];
  sendQuery: (
    msg: DBSSchema["llm_messages"]["message"] | undefined,
  ) => Promise<void>;
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
        const method = methods[tu.name];
        const { id, name } = tu;
        if (!method)
          return {
            type: "tool_result",
            // name,
            tool_use_id: id,
            content: "Method not found or not allowed",
            is_error: true,
          } satisfies LLMMessage["message"][number];
        const methodFunc = typeof method === "function" ? method : method.run;
        try {
          const result = await methodFunc(tu.input);
          return {
            type: "tool_result",
            content: JSON.stringify(result),
            tool_use_id: id,
          } satisfies LLMMessage["message"][number];
        } catch (e) {
          return {
            type: "tool_result",
            content: JSON.stringify(e),
            // name,
            tool_use_id: id,
          } satisfies LLMMessage["message"][number];
        }
      }),
    );
    await sendQuery(results);
  }, [messages, methods, sendQuery]);
};

const isAssistantMessageRequestingToolUse = (
  message: DBSSchema["llm_messages"] | undefined,
): message is DBSSchema["llm_messages"] => {
  return Boolean(message && getLLMMessageToolUse(message).length);
};
