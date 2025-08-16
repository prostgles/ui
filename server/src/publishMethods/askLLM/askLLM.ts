import type { Filter } from "prostgles-server/dist/DboBuilder/DboBuilderTypes";
import { HOUR } from "prostgles-server/dist/FileManager/FileManager";
import { getSerialisableError, isObject, omitKeys } from "prostgles-types";
import { type DBS } from "../..";
import { dashboardTypes } from "../../../../commonTypes/DashboardTypes";
import {
  filterArr,
  getLLMMessageText,
  isAssistantMessageRequestingToolUse,
  LLM_PROMPT_VARIABLES,
  reachedMaximumNumberOfConsecutiveToolRequests,
} from "../../../../commonTypes/llmUtils";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import { sliceText } from "../../../../commonTypes/utils";
import { getElectronConfig } from "../../electronConfig";
import { checkLLMLimit } from "./checkLLMLimit";
import { fetchLLMResponse, type LLMMessageWithRole } from "./fetchLLMResponse";
import { getLLMAllowedChatTools } from "./getLLMTools";

import type { AuthClientRequest } from "prostgles-server/dist/Auth/AuthTypes";
import {
  getMCPToolNameParts,
  type PROSTGLES_MCP_SERVERS_AND_TOOLS,
} from "../../../../commonTypes/prostglesMcp";
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
  type: "new-message" | "approve-tool-use" | "tool-use-result";
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

  const {
    chat,
    prompt,
    pastMessages,
    promptObj,
    getChat,
    llm_credential,
    llm_prompt_id,
  } = await getValidatedAskLLMChatOptions(args);

  const toolsWithInfo = await getLLMAllowedChatTools({
    userType: user.type,
    dbs,
    chat,
    connectionId,
    prompt: promptObj,
  });
  const tools = toolsWithInfo?.map(
    ({ name, description, input_schema, auto_approve }) => {
      return {
        name,
        description,
        input_schema: omitKeys(input_schema, ["$id"]),
        auto_approve,
      };
    },
  );

  const lastMessage = pastMessages.at(-1);
  if (type === "approve-tool-use") {
    if (!lastMessage) {
      throw new Error("Last message not found for tool use approval");
    }
    const toolUseMessages = filterArr(lastMessage.message, {
      type: "tool_use",
    } as const);

    return runApprovedTools(
      toolsWithInfo,
      args,
      chat,
      toolUseMessages,
      userMessage,
    );
  }

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
            sliceText(questionText, 25).replaceAll("\n", " ")
          ),
      },
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
      status: { state: "loading", since: new Date().toISOString() },
    },
  );
  const aiResponseMessagePlaceholder = await dbs.llm_messages.insert(
    {
      user_id: null,
      chat_id: chatId,
      message: [{ type: "text", text: "" }],
      llm_model_id: chat.model,
    },
    { returning: "*" },
  );
  try {
    const { maximum_consecutive_tool_fails, max_total_cost_usd } = chat;
    const maxTotalCost = parseFloat(max_total_cost_usd || "0");
    if (maxTotalCost && maxTotalCost > 0) {
      const chatCost = pastMessages.reduce(
        (acc, m) => acc + parseFloat(m.cost),
        0,
      );
      if (chatCost > maxTotalCost) {
        throw `Maximum total cost of the chat (${maxTotalCost}) reached. Current cost: ${chatCost}`;
      }
    }
    const promptWithContext = prompt
      .replaceAll(
        LLM_PROMPT_VARIABLES.PROSTGLES_SOFTWARE_NAME,
        getElectronConfig()?.isElectron ? "Prostgles Desktop" : "Prostgles UI",
      )
      .replace(LLM_PROMPT_VARIABLES.TODAY, new Date().toISOString())
      .replace(
        LLM_PROMPT_VARIABLES.SCHEMA,
        schema ||
          "Schema is empty: there are no tables or views in the database",
      )
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
      content: aiResponseMessage,
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
      { id: aiResponseMessagePlaceholder.id },
      {
        message: aiResponseMessage,
        meta,
        cost,
      },
    );

    if (
      maximum_consecutive_tool_fails &&
      args.type !== "approve-tool-use" &&
      isAssistantMessageRequestingToolUse({ message: aiResponseMessage }) &&
      reachedMaximumNumberOfConsecutiveToolRequests(
        [...pastMessages, { message: userMessage }],
        maximum_consecutive_tool_fails,
        true,
      )
    ) {
      throw `Maximum number (${maximum_consecutive_tool_fails}) of failed consecutive tool requests reached`;
    }

    const latestChat = await getChat();
    if (!latestChat) throw "Chat not found after LLM response";

    const newToolUseMessages = filterArr(aiResponseMessage, {
      type: "tool_use",
    } as const);
    if (latestChat.status?.state !== "stopped" && newToolUseMessages.length) {
      await runApprovedTools(
        toolsWithInfo,
        args,
        latestChat,
        newToolUseMessages,
        undefined,
      );
    }
  } catch (err) {
    console.error(err);
    const isAdmin = user.type === "admin";
    const errorObjOrString = getSerialisableError(err);
    const errorIsString = typeof errorObjOrString === "string";
    const errorTextOrEmpty =
      isObject(errorObjOrString) ?
        JSON.stringify(errorObjOrString, null, 2)
      : errorObjOrString;
    const errorText = isAdmin ? `${errorTextOrEmpty}` : "";
    const messageText = [
      "🔴 Something went wrong",
      errorIsString ? errorText : ["```json", errorText, "```"].join("\n"),
    ].join("\n");
    await dbs.llm_messages.update(
      { id: aiResponseMessagePlaceholder.id },
      {
        message: [{ type: "text", text: messageText }],
      },
    );
  }

  await dbs.llm_chats.update(
    { id: chatId },
    {
      status: null,
    },
  );
};

const getValidatedAskLLMChatOptions = async ({
  userMessage,
  type,
  chatId,
  dbs,
  user,
}: AskLLMArgs) => {
  if (!userMessage.length && type === "new-message") throw "Message is empty";
  if (!Number.isInteger(chatId)) throw "chatId must be an integer";
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
  if (!llm_prompt_id) throw "Chat missing prompt";
  if (!llm_credential) throw "LLM credentials missing";
  const promptObj = await dbs.llm_prompts.findOne({ id: llm_prompt_id });
  if (!promptObj) throw "Prompt not found";
  const { prompt } = promptObj;
  const pastMessages = await dbs.llm_messages.find(
    { chat_id: chatId },
    { orderBy: { created: 1 } },
  );
  return {
    prompt,
    promptObj,
    pastMessages,
    chat,
    llm_credential,
    llm_prompt_id,
    getChat,
  };
};
