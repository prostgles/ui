import { getErrorAsObject } from "prostgles-server/dist/DboBuilder/dboBuilderUtils";
import { HOUR } from "prostgles-server/dist/FileManager/FileManager";
import { type DBS } from "../..";
import { contentOfThisFile as dashboardTypes } from "../../../../commonTypes/DashboardTypes";
import { getLLMMessageText } from "../../../../commonTypes/llmUtils";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import { checkLLMLimit } from "./checkLLMLimit";
import { fetchLLMResponse, type LLMMessage } from "./fetchLLMResponse";
import { getLLMTools } from "./getLLMTools";

export const askLLM = async (
  // question: string,
  userMessage: DBSSchema["llm_messages"]["message"],
  schema: string,
  chatId: number,
  dbs: DBS,
  user: DBSSchema["users"],
  allowedLLMCreds: DBSSchema["access_control_allowed_llm"][] | undefined,
  accessRules: DBSSchema["access_control"][] | undefined,
) => {
  if (!userMessage.length) throw "Message is empty";
  if (!Number.isInteger(chatId)) throw "chatId must be an integer";
  const chat = await dbs.llm_chats.findOne({ id: chatId, user_id: user.id });
  if (!chat) throw "Chat not found";
  const { llm_prompt_id, llm_credential_id } = chat;
  if (!llm_prompt_id || !llm_credential_id)
    throw "Chat missing prompt or credential";
  const llm_credential = await dbs.llm_credentials.findOne({
    id: llm_credential_id,
  });
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
      c.llm_credential_id === llm_credential_id &&
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
    dbs.llm_chats.update(
      { id: chatId },
      { name: questionText.slice(0, 25) + "..." },
    );
  }

  const aiResponseMessage = await dbs.llm_messages.insert(
    {
      user_id: null as any,
      chat_id: chatId,
      message: [{ type: "text", text: "" }],
    },
    { returning: "*" },
  );
  try {
    const promptWithContext = prompt
      .replace("${schema}", schema)
      .replace("${dashboardTypes}", dashboardTypes);

    /** Tools are not used with Dashboarding due to induced errors */
    const tools =
      promptObj.name === "Dashboarding" ?
        undefined
      : await getLLMTools({
          dbs,
          chatId,
          Provider: llm_credential.config.Provider,
        });

    const llmResponseMessage = await fetchLLMResponse({
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
                role: m.user_id ? "user" : "assistant",
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
      { message: llmResponseMessage },
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
      },
    );
  }
};

export const insertDefaultPrompts = async (dbs: DBS) => {
  /** In case of stale schema update */
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!dbs.llm_prompts) {
    console.warn("llm_prompts table not found");
    return;
  }

  const prompt = await dbs.llm_prompts.findOne();
  if (prompt) {
    console.warn("Default prompts already exist");
    return;
  }
  const adminUser = await dbs.users.findOne({ passwordless_admin: true });
  const user_id = adminUser?.id;
  await dbs.llm_prompts.insert({
    name: "Chat",
    description: "Basic chat",
    user_id,
    prompt: [
      "You are an assistant for a PostgreSQL based software called Prostgles Desktop.",
      "Assist user with any queries they might have. Do not add empty lines in your sql response.",
      "Reply with a full and concise answer that does not require further clarification or revisions.",
      "Below is the database schema they're currently working with:",
      "",
      "${schema}",
    ].join("\n"),
  });
  await dbs.llm_prompts.insert({
    name: "Dashboards",
    description: "Create dashboards. Claude Sonnet recommended",
    user_id,
    prompt: [
      "You are an assistant for a PostgreSQL based software called Prostgles Desktop.",
      "Assist user with any queries they might have.",
      "Below is the database schema they're currently working with:",
      "",
      "${schema}",
      "",
      "Using dashboard structure below create workspaces with useful views my current schema.",
      "Return a json of this format: { prostglesWorkspaces: WorkspaceInsertModel[] }",
      "Return valid json, markdown compatible and in a clearly delimited section with a json code block.",
      "",
      "${dashboardTypes}",
    ].join("\n"),
  });

  const addedPrompts = await dbs.llm_prompts.find();
  console.warn("Added default prompts", addedPrompts);
};
