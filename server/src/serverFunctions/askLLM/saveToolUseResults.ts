import { filterArr } from "@common/llmUtils";
import type { AskLLMArgs } from "./askLLM";
import { getPastMessages } from "./getPastMessages";
import { getPendingToolUseMessages } from "./getPendingToolUseMessages";

export const saveToolUseResults = async ({
  dbs,
  chatId,
  user,
  userMessage,
}: Pick<AskLLMArgs, "dbs" | "chatId" | "user" | "userMessage">) => {
  return dbs.tx(async (tx) => {
    /* Serialize partial answers so concurrent submissions cannot overwrite each other. */
    await tx.llm_chats.find({ id: chatId }, { forUpdate: true });
    const pastMessages = await getPastMessages(tx, chatId);
    const pendingTools = getPendingToolUseMessages(pastMessages);
    const newResults = filterArr(userMessage, {
      type: "tool_result" as const,
    }).filter((result) =>
      pendingTools.some(
        (tool) =>
          tool.id === result.tool_use_id && tool.name === result.tool_name,
      ),
    );
    if (!newResults.length) return;

    const toolUseMessage = pastMessages.findLast(({ message }) =>
      message.some(
        (content) =>
          content.type === "tool_use" &&
          newResults.some((result) => result.tool_use_id === content.id),
      ),
    );
    if (!toolUseMessage) return;
    const lastMessage = pastMessages.at(-1);
    if (
      lastMessage?.message.every((content) => content.type === "tool_result")
    ) {
      await tx.llm_messages.update(
        { id: lastMessage.id },
        { message: [...lastMessage.message, ...newResults] },
      );
    } else {
      await tx.llm_messages.insert({
        user_id: user.id,
        chat_id: chatId,
        llm_model_id: toolUseMessage.llm_model_id,
        message: newResults,
        total_tokens: 0,
      });
    }
    const remainingTools = filterArr(toolUseMessage.message, {
      type: "tool_use" as const,
    }).filter(
      (tool) =>
        pendingTools.some(({ id }) => id === tool.id) &&
        !newResults.some((result) => result.tool_use_id === tool.id),
    );
    return { toolUseMessage, remainingTools };
  });
};
