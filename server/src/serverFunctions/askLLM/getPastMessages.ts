import type { DBS } from "@src/index";

export const getPastMessages = async (dbs: DBS, chatId: number) => {
  const messages = await dbs.llm_messages.find(
    { chat_id: chatId },
    { orderBy: { created: 1 } },
  );
  return messages;
};
