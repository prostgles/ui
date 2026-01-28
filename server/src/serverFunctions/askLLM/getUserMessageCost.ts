import type { DBSSchema } from "@common/publishUtils";
import type { LLMMessage } from "./askLLM";
import { getLlmMessageCost } from "./getLLMUsageCost";

const TOKENS_PER_CHARACTER = 0.25;

export const getUserMessageCost = (
  userMessage: LLMMessage,
  model: DBSSchema["llm_models"],
): number => {
  const messageTextLength = JSON.stringify(userMessage).length;

  return (
    getLlmMessageCost(model, {
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      inputTokens: messageTextLength * TOKENS_PER_CHARACTER,
      outputTokens: 0,
    }) ?? 0
  );
};
