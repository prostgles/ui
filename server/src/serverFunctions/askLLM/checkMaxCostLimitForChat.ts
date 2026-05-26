import type { DBSSchema } from "@common/publishUtils";
import type { DBS } from "@src/index";
import { getUserMessageCost } from "./getUserMessageCost";

export const checkMaxCostLimitForChat = async (
  dbs: DBS,
  chat: DBSSchema["llm_chats"],
  model: DBSSchema["llm_models"],
  pastMessages: DBSSchema["llm_messages"][],
) => {
  const userMessage = pastMessages.at(-1)?.message;
  if (!userMessage) {
    return;
  }
  const { max_total_cost_usd } = chat;
  const maxTotalCost = parseFloat(String(max_total_cost_usd || 0));
  if (maxTotalCost && maxTotalCost > 0) {
    const pastMessageCost = pastMessages.reduce(
      (acc, m) => acc + parseFloat(String(m.cost)),
      0,
    );
    const stopChat = async (
      reason: "estimated_future_max_total_cost_usd" | "max_total_cost_usd",
    ) => {
      await dbs.llm_chats.update(
        { id: chat.id },

        {
          status: {
            state: "stopped",
            reason,
            timestamp: new Date().toISOString(),
          },
        },
      );
    };
    if (pastMessageCost > maxTotalCost) {
      await stopChat("max_total_cost_usd");
      throw `Maximum total cost of the chat (${maxTotalCost}) reached. Current cost: ${pastMessageCost}`;
    }
    const currentMessageCost = getUserMessageCost(userMessage, model);
    if (pastMessageCost + currentMessageCost > maxTotalCost) {
      await stopChat("estimated_future_max_total_cost_usd");
      throw [
        `Maximum total cost of the chat (${maxTotalCost}) will be reached after sending this message.`,
        `Current cost: ${pastMessageCost}.`,
        `Estimated cost of current message: ${currentMessageCost}`,
      ].join("\n");
    }
  }
};
