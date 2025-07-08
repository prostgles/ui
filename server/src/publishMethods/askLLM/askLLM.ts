import type { Filter } from "prostgles-server/dist/DboBuilder/DboBuilderTypes";
import { HOUR } from "prostgles-server/dist/FileManager/FileManager";
import { getSerialisableError, isObject, omitKeys } from "prostgles-types";
import { type DBS } from "../..";
import { dashboardTypes } from "../../../../commonTypes/DashboardTypes";
import {
  getLLMMessageText,
  LLM_PROMPT_VARIABLES,
} from "../../../../commonTypes/llmUtils";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import { sliceText } from "../../../../commonTypes/utils";
import { getElectronConfig } from "../../electronConfig";
import { checkLLMLimit } from "./checkLLMLimit";
import { fetchLLMResponse, type LLMMessageWithRole } from "./fetchLLMResponse";
import { getLLMTools, type MCPToolSchema } from "./getLLMTools";

import type { AuthClientRequest } from "prostgles-server/dist/Auth/AuthTypes";
import {
  getMCPToolNameParts,
  type PROSTGLES_MCP_SERVERS_AND_TOOLS,
} from "../../../../commonTypes/mcp";
import { runApprovedTools } from "./runApprovedTools/runApprovedTools";

export const getBestLLMChatModel = async (
  dbs: DBS,
  filter: Parameters<DBS["llm_models"]["findOne"]>[0],
) => {
  const preferredChatModel = await dbs.llm_models.findOne(filter, {
    orderBy: [{ key: "chat_suitability_rank", asc: true, nulls: "last" }],
  });
  if (!preferredChatModel)
    throw "No LLM models found for " + JSON.stringify(filter);
  return preferredChatModel;
};

export type LLMMessage = DBSSchema["llm_messages"]["message"];

export type AskLLMArgs = {
  connectionId: string;
  userMessage: LLMMessage;
  schema: string;
  chatId: number;
  dbs: DBS;
  user: Pick<DBSSchema["users"], "id" | "type">;
  allowedLLMCreds: DBSSchema["access_control_allowed_llm"][] | undefined;
  accessRules: DBSSchema["access_control"][] | undefined;
  clientReq: AuthClientRequest;
  type: "new-message" | "approve-tool-use";
};

export const askLLM = async (args: AskLLMArgs) => {
  const {
    accessRules,
    allowedLLMCreds,
    chatId,
    connectionId,
    dbs,
    user,
    schema,
    userMessage,
    type,
  } = args;
  if (!userMessage.length) throw "Message is empty";
  if (!Number.isInteger(chatId)) throw "chatId must be an integer";
  const getChat = () => dbs.llm_chats.findOne({ id: chatId, user_id: user.id });
  let chat = await getChat();
  if (!chat) throw "Chat not found";
  const { llm_prompt_id } = chat;
  if (!chat.model) {
    const preferredChatModel = await getBestLLMChatModel(dbs, {
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
  const pastMessages = await dbs.llm_messages.find(
    { chat_id: chatId },
    { orderBy: { created: 1 } },
  );

  const toolsWithInfo = await getLLMTools({
    isAdmin: user.type === "admin",
    dbs,
    chat,
    connectionId,
    prompt: promptObj,
  });
  const tools = toolsWithInfo?.map(({ name, description, input_schema }) => {
    return {
      name,
      description,
      input_schema: omitKeys(input_schema, ["$id"]),
    } satisfies MCPToolSchema;
  });

  const lastMessage = pastMessages.at(-1);
  if (type === "new-message") {
    await dbs.llm_messages.insert({
      user_id: user.id,
      chat_id: chatId,
      message: userMessage,
      llm_model_id: chat.model,
    });

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
  } else {
    return runApprovedTools(
      args,
      chat,
      userMessage,
      lastMessage?.message,
      toolsWithInfo,
    );
  }

  const allowedUsedCreds = allowedLLMCreds?.filter(
    (c) =>
      c.llm_credential_id === llm_credential.id &&
      c.llm_prompt_id === llm_prompt_id,
  );

  // Check if usage limit reached
  if (allowedUsedCreds) {
    const limitReachedMessage = await checkLLMLimit(
      dbs,
      user,
      allowedUsedCreds,
      accessRules ?? [],
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

  const hasMessagesThatNeedsAIResponse = userMessage.some(
    (m) =>
      !(
        m.type === "tool_result" &&
        !m.is_error &&
        getMCPToolNameParts(m.tool_name)?.serverName ===
          ("prostgles-ui" satisfies keyof typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)
      ),
  );
  if (!hasMessagesThatNeedsAIResponse) {
    return;
  }

  await dbs.llm_chats.update(
    { id: chatId },
    {
      is_loading: new Date(),
    },
  );
  const aiResponseMessage = await dbs.llm_messages.insert(
    {
      user_id: null,
      chat_id: chatId,
      message: [{ type: "text", text: "" }],
      llm_model_id: chat.model,
    },
    { returning: "*" },
  );
  try {
    const promptWithContext = prompt
      .replaceAll(
        LLM_PROMPT_VARIABLES.PROSTGLES_SOFTWARE_NAME,
        getElectronConfig()?.isElectron ? "Prostgles Desktop" : "Prostgles UI",
      )
      .replace(LLM_PROMPT_VARIABLES.TODAY, new Date().toISOString())
      .replace(LLM_PROMPT_VARIABLES.SCHEMA, schema)
      .replace(LLM_PROMPT_VARIABLES.DASHBOARD_TYPES, dashboardTypes);

    const modelData = (await dbs.llm_models.findOne(
      { id: chat.model },
      {
        select: {
          "*": 1,
          llm_providers: "*",
        },
      },
    )) as
      | (DBSSchema["llm_models"] & {
          llm_providers: DBSSchema["llm_providers"][];
        })
      | undefined;

    if (!modelData) throw "Model not found";
    const {
      llm_providers: [llm_provider],
      ...llm_model
    } = modelData;
    if (!llm_provider) throw "Provider not found";

    const gemini25BreakingChanges = llm_model.name.includes("gemini-2.5");
    const {
      content: llmResponseMessage,
      meta,
      cost,
    } = await fetchLLMResponse({
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
                  : gemini25BreakingChanges ? "model"
                  : "assistant",
                content: m.message,
              }) satisfies LLMMessageWithRole,
          ),
        {
          role: "user",
          content: userMessage,
        } satisfies LLMMessageWithRole,
      ],
    });
    await dbs.llm_messages.update(
      { id: aiResponseMessage.id },
      {
        message: llmResponseMessage,
        meta,
        cost,
      },
    );

    await runApprovedTools(
      args,
      chat,
      llmResponseMessage,
      lastMessage?.message,
      toolsWithInfo,
    );
  } catch (err) {
    console.error(err);
    const isAdmin = user.type === "admin";
    const errorObjOrString = getSerialisableError(err);
    const errorTextOrEmpty =
      isObject(errorObjOrString) ?
        JSON.stringify(errorObjOrString, null, 2)
      : errorObjOrString;
    const errorText = isAdmin ? `${errorTextOrEmpty}` : "";
    const messageText = [
      "🔴 Something went wrong",
      "```json\n" + errorText + "\n```",
    ].join("\n");
    await dbs.llm_messages.update(
      { id: aiResponseMessage.id },
      {
        message: [{ type: "text", text: messageText }],
      },
    );
  }

  await dbs.llm_chats.update(
    { id: chatId },
    {
      is_loading: null,
    },
  );
};
