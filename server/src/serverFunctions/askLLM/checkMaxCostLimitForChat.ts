import type { DBSSchema } from "@common/publishUtils";
import { getUserMessageCost } from "./getUserMessageCost";
import type { LLMMessage } from "./askLLM";

export const checkMaxCostLimitForChat = (
  chat: DBSSchema["llm_chats"],
  model: DBSSchema["llm_models"],
  pastMessages: DBSSchema["llm_messages"][],
  userMessage: LLMMessage,
) => {
  const { max_total_cost_usd } = chat;
  const maxTotalCost = parseFloat(max_total_cost_usd || "0");
  if (maxTotalCost && maxTotalCost > 0) {
    const pastMessageCost = pastMessages.reduce(
      (acc, m) => acc + parseFloat(m.cost),
      0,
    );
    if (pastMessageCost > maxTotalCost) {
      throw `Maximum total cost of the chat (${maxTotalCost}) reached. Current cost: ${pastMessageCost}`;
    }
    const currentMessageCost = getUserMessageCost(userMessage, model);
    if (pastMessageCost + currentMessageCost > maxTotalCost) {
      throw [
        `Maximum total cost of the chat (${maxTotalCost}) will be reached after sending this message.`,
        `Current cost: ${pastMessageCost}.`,
        `Estimated cost of current message: ${currentMessageCost}`,
      ].join("\n");
    }
  }
};
