import { filterArr } from "@common/llmUtils";
import type { DBSSchema } from "@common/publishUtils";

export const getPendingToolUseMessages = (
  messages: Pick<DBSSchema["llm_messages"], "message">[],
) => {
  const completedToolIds = new Set(
    messages.flatMap(({ message }) =>
      filterArr(message, { type: "tool_result" as const }).map(
        ({ tool_use_id }) => tool_use_id,
      ),
    ),
  );
  return messages.flatMap(({ message }) =>
    filterArr(message, { type: "tool_use" as const }).filter(
      ({ id }) => !completedToolIds.has(id),
    ),
  );
};
