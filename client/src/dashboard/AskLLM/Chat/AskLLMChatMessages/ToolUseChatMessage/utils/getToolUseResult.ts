import { filterArr } from "@common/llmUtils";
import type { DBSSchema } from "@common/publishUtils";

import type { ToolResultMessage, ToolUseMessage } from "../ToolUseChatMessage";

export const getToolUseResult = ({
  messages,
  toolUseMessageIndex,
  toolUseMessageContentIndex,
}: {
  toolUseMessageIndex: number;
  toolUseMessageContentIndex: number;
  messages: DBSSchema["llm_messages"][];
}):
  | undefined
  | {
      toolUseResult: DBSSchema["llm_messages"];
      toolUseResultMessage: ToolResultMessage;
    } => {
  const toolUseMessageRequest = messages[toolUseMessageIndex]!.message[
    toolUseMessageContentIndex
  ] as ToolUseMessage;
  const nextMessage = messages[toolUseMessageIndex + 1];
  if (!nextMessage) return;

  const toolResults = filterArr(nextMessage.message, {
    type: "tool_result",
  } as const);

  const result = toolResults.find(
    (tr) => tr.tool_use_id === toolUseMessageRequest.id,
  );
  if (!result) {
    return;
  }

  return {
    toolUseResult: nextMessage,
    toolUseResultMessage: result,
  };
};
