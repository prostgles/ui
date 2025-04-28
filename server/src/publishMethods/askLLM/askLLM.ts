import { getErrorAsObject } from "prostgles-server/dist/DboBuilder/dboBuilderUtils";
import { HOUR } from "prostgles-server/dist/FileManager/FileManager";
import { type DBS } from "../..";
import { dashboardTypes } from "../../../../commonTypes/DashboardTypes";
import { getLLMMessageText } from "../../../../commonTypes/llmUtils";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import { checkLLMLimit } from "./checkLLMLimit";
import { fetchLLMResponse, type LLMMessage } from "./fetchLLMResponse";
import { getLLMTools } from "./getLLMTools";
import { sliceText } from "../../../../commonTypes/utils";
import type { Filter } from "prostgles-server/dist/DboBuilder/DboBuilderTypes";

export const getLLMChatModel = async (
  dbs: DBS,
  filter: Parameters<DBS["llm_models"]["findOne"]>[0],
) => {
  const preferredChatModel = await dbs.llm_models.findOne(filter, {
    orderBy: [{ key: "chat_suitability_rank", asc: true, nulls: "last" }],
  });
  if (!preferredChatModel) throw "No LLM models found";
  return preferredChatModel;
};

export const askLLM = async (
  connectionId: string,
  userMessage: DBSSchema["llm_messages"]["message"],
  schema: string,
  chatId: number,
  dbs: DBS,
  user: Pick<DBSSchema["users"], "id" | "type">,
  allowedLLMCreds: DBSSchema["access_control_allowed_llm"][] | undefined,
  accessRules: DBSSchema["access_control"][] | undefined,
) => {
  if (!userMessage.length) throw "Message is empty";
  if (!Number.isInteger(chatId)) throw "chatId must be an integer";
  const getChat = () => dbs.llm_chats.findOne({ id: chatId, user_id: user.id });
  let chat = await getChat();
  if (!chat) throw "Chat not found";
  const { llm_prompt_id } = chat;
  if (!chat.model) {
    const preferredChatModel = await getLLMChatModel(dbs, {
      $existsJoined: {
        "llm_providers.llm_credentials": {},
      },
    } as Filter);
    await dbs.llm_chats.update(
      { id: chatId },
      { model: preferredChatModel.id },
    );
    chat = await getChat();
  }
  if (!chat?.model) throw "Chat model not found";
  const llm_credential = await dbs.llm_credentials.findOne({
    $existsJoined: {
      "llm_providers.llm_models": {
        id: chat.model,
      },
    },
  } as Filter);
  if (!llm_prompt_id) throw "Chat missing prompt";
  if (!llm_credential) throw "LLM credentials missing";
  const promptObj = await dbs.llm_prompts.findOne({ id: llm_prompt_id });
  if (!promptObj) throw "Prompt not found";
  const { prompt } = promptObj;
  if (!prompt) throw "Prompt is empty";
  const pastMessages = await dbs.llm_messages.find(
    { chat_id: chatId },
    { orderBy: { created: 1 } },
  );

  await dbs.llm_messages.insert({
    user_id: user.id,
    chat_id: chatId,
    message: userMessage,
  });

  const allowedUsedCreds = allowedLLMCreds?.filter(
    (c) =>
      c.llm_credential_id === llm_credential.id &&
      c.llm_prompt_id === llm_prompt_id,
  );
  if (allowedUsedCreds) {
    const limitReachedMessage = await checkLLMLimit(
      dbs,
      user,
      allowedUsedCreds,
      accessRules!,
    );
    if (limitReachedMessage) {
      await dbs.llm_chats.update(
        { id: chatId },
        {
          disabled_message: limitReachedMessage,
          disabled_until: new Date(Date.now() + 24 * HOUR),
        },
      );
      return;
    } else if (chat.disabled_message) {
      await dbs.llm_chats.update(
        { id: chatId },
        {
          disabled_message: null,
          disabled_until: null,
        },
      );
    }
  }

  /** Update chat name based on first user message */
  const isFirstUserMessage = !pastMessages.some((m) => m.user_id === user.id);
  if (isFirstUserMessage) {
    const questionText = getLLMMessageText({ message: userMessage });
    const isOnlyImage =
      !questionText && userMessage.some((m) => m.type === "image");
    void dbs.llm_chats.update(
      { id: chatId },
      {
        name:
          isOnlyImage ? "[Attached image]" : (
            sliceText(questionText, 25)?.replaceAll("\n", " ")
          ),
      },
    );
  }

  const aiResponseMessage = await dbs.llm_messages.insert(
    {
      user_id: null as any,
      chat_id: chatId,
      is_loading: true,
      message: [{ type: "text", text: "" }],
    },
    { returning: "*" },
  );
  try {
    const promptWithContext = prompt
      .replace("${schema}", schema)
      .replace("${dashboardTypes}", dashboardTypes);

    const tools = await getLLMTools({
      isAdmin: user.type === "admin",
      dbs,
      chat,
      provider: llm_credential.provider_id,
      connectionId,
      prompt: promptObj,
    });

    const modelData = await dbs.llm_models.findOne(
      { id: chat.model },
      {
        select: {
          "*": 1,
          llm_providers: "*",
        },
      },
    );

    if (!modelData) throw "Model not found";
    const {
      llm_providers: [llm_provider],
      ...llm_model
    } = modelData;
    if (!llm_provider) throw "Provider not found";
    const gemini25BreakingChanges = llm_model.name.includes("gemini-2.5");
    const { content: llmResponseMessage, meta } = await fetchLLMResponse({
      llm_chat: chat,
      llm_model,
      llm_provider,
      llm_credential,
      tools,
      messages: [
        {
          /** TODO check if this works with all providers */
          role: "system",
          content: [{ type: "text", text: promptWithContext }],
        },
        ...pastMessages
          /**all messages must have non-empty content */
          .filter((m) => m.message.length)
          .map(
            (m) =>
              ({
                role:
                  m.user_id ? "user"
                  : gemini25BreakingChanges ? ("model" as any)
                  : "assistant",
                content: m.message,
              }) satisfies LLMMessage,
          ),
        {
          role: "user",
          content: userMessage,
        } satisfies LLMMessage,
      ],
    });
    await dbs.llm_messages.update(
      { id: aiResponseMessage.id },
      {
        is_loading: false,
        message: llmResponseMessage,
        meta,
      },
    );
  } catch (err) {
    console.error(err);
    const isAdmin = user.type === "admin";
    const errorText =
      isAdmin ? JSON.stringify(getErrorAsObject(err), null, 2) : "";
    const messageText = ["🔴 Something went wrong", errorText].join("\n");
    await dbs.llm_messages.update(
      { id: aiResponseMessage.id },
      {
        message: [{ type: "text", text: messageText }],
        is_loading: false,
      },
    );
  }
};
