import { filterArr } from "@common/llmUtils";
import type { DBSSchema } from "@common/publishUtils";

import type { ToolResultMessage, ToolUseMessage } from "../ToolUseChatMessage";

export const getToolUseResult = ({
  toolUseMessage,
  nextMessage,
  toolUseMessageContentIndex,
}: {
  toolUseMessageContentIndex: number;
  toolUseMessage: DBSSchema["llm_messages"];
  nextMessage: DBSSchema["llm_messages"] | undefined;
}):
  | undefined
  | {
      toolUseResult: DBSSchema["llm_messages"];
      toolUseResultMessage: ToolResultMessage;
    } => {
  const toolUseMessageRequest = toolUseMessage.message[
    toolUseMessageContentIndex
  ] as ToolUseMessage;
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
