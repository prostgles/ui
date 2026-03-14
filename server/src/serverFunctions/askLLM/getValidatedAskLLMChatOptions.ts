import type { Filter } from "prostgles-server/dist/DboBuilder/DboBuilderTypes";
import { getBestLLMChatModel, type AskLLMArgs } from "./askLLM";

export const getValidatedAskLLMChatOptions = async ({
  userMessage,
  type,
  chatId,
  dbs,
  user,
}: AskLLMArgs) => {
  if (!userMessage.length && type === "new-message") {
    throw "Message is empty";
  }
  if (!Number.isInteger(chatId)) {
    throw "chatId must be an integer";
  }
  const getChat = () => dbs.llm_chats.findOne({ id: chatId, user_id: user.id });
  let maybeChat = await getChat();
  if (!maybeChat) throw "Chat not found";
  const { llm_prompt_id } = maybeChat;
  if (!maybeChat.model) {
    const preferredChatModel = await getBestLLMChatModel(dbs, {
      $existsJoined: {
        "llm_providers.llm_credentials": {},
      },
    } as Filter);
    await dbs.llm_chats.update(
      { id: chatId },
      { model: preferredChatModel.id },
    );
    maybeChat = await getChat();
  }
  if (!maybeChat?.model) throw "Chat model not found";
  const chat = { ...maybeChat, model: maybeChat.model };
  const llm_credential = await dbs.llm_credentials.findOne({
    $existsJoined: {
      "llm_providers.llm_models": {
        id: chat.model,
      },
    },
  } as Filter);
  if (!llm_credential) throw "LLM credentials missing";
  const { agent_info } = chat;
  let prompt = agent_info !== "orchestrator" ? (agent_info?.prompt ?? "") : "";
  if (llm_prompt_id) {
    const promptObj = await dbs.llm_prompts.findOne({ id: llm_prompt_id });
    if (!promptObj) throw "Prompt not found";
    ({ prompt } = promptObj);
  }

  return {
    prompt,
    chat,
    llm_credential,
    llm_prompt_id,
    getChat,
  };
};
