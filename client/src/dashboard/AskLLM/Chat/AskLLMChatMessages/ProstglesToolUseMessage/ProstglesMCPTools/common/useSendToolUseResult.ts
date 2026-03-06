import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { useCallback } from "react";

export const useSendToolUseResult = () => {
  const {
    dbsMethods: { askLLM },
    connectionId,
  } = usePrgl();

  const sendToolUseResult = useCallback(
    ({
      chatId,
      toolName,
      toolUseId,
      content,
    }: {
      chatId: number;
      toolUseId: string;
      toolName: string;
      content: {
        type: "text";
        text: string;
      }[];
    }) => {
      return askLLM!({
        chatId,
        connectionId,
        type: "tool-use-result",
        userMessage: [
          {
            type: "tool_result",
            tool_use_id: toolUseId,
            tool_name: toolName,
            content,
          },
        ],
        schema: "",
      });
    },
    [askLLM, connectionId],
  );

  return { sendToolUseResult };
};
