import { usePromise } from "prostgles-client/dist/react-hooks";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
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
  sendQuery: (msg: string | undefined) => Promise<void>;
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
    const { tool_use = [] } = lastMessage;
    fetchingForMessageId.current = lastMessage.id;
    const results = await Promise.all(
      tool_use!.map(async (tu) => {
        const method = methods[tu.name];
        if (!method)
          return {
            error: "Method not found or not allowed",
            result: undefined,
            tool_name: tu.name,
          };
        const methodFunc = typeof method === "function" ? method : method.run;
        try {
          const result = await methodFunc(tu.input);
          return { error: undefined, result, tool_name: tu.name };
        } catch (e) {
          return { error: e, result: undefined, tool_name: tu.name };
        }
      }),
    );
    const message = [
      "```tool_result",
      ...results.map((r) => {
        if (r.error) {
          return `Error: ${JSON.stringify(r.error)}`;
        }
        return JSON.stringify(r.result);
      }),
    ].join("\n");
    await sendQuery(message);
  }, [messages, methods, sendQuery]);
};

const isAssistantMessageRequestingToolUse = (
  message: DBSSchema["llm_messages"] | undefined,
): message is DBSSchema["llm_messages"] => {
  if (!message) return false;
  return Boolean(!message.user_id && message.tool_use?.length);
};
