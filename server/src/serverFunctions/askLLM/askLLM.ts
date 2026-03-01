import {
  filterArr,
  filterArrInverse,
  getLLMMessageText,
  isAssistantMessageRequestingToolUse,
  reachedMaximumNumberOfConsecutiveToolRequests,
} from "@common/llmUtils";
import type { DBSSchema } from "@common/publishUtils";
import { sliceText } from "@common/utils";
import { HOUR } from "prostgles-server/dist/FileManager/FileManager";
import {
  getProperty,
  getSerialisableError,
  isObject,
  omitKeys,
  tryCatchV2,
} from "prostgles-types";
import { type DBS } from "../..";
import { checkLLMLimit } from "./checkLLMLimit";
import { fetchLLMResponse, type LLMMessageWithRole } from "./fetchLLMResponse";
import { getLLMToolsAllowedInThisChat } from "./getLLMToolsAllowedInThisChat";

import {
  getMCPToolNameParts,
  PROSTGLES_MCP_SERVERS_AND_TOOLS,
} from "@common/prostglesMcp";
import type { AuthClientRequest } from "prostgles-server/dist/Auth/AuthTypes";
import { checkMaxCostLimitForChat } from "./checkMaxCostLimitForChat";
import { getFullPrompt } from "./getFullPrompt";
import { getValidatedAskLLMChatOptions } from "./getValidatedAskLLMChatOptions";
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
  type:
    | "new-message"
    | "approve-tool-use"
    | "tool-use-result"
    | "tool-use-result-with-denied";
  aborter: AbortController | undefined;
};

const activeLLMFetchRequests = new Map<number, AbortController>();

export const stopAskLLM = (chatId: number) => {
  const aborter = activeLLMFetchRequests.get(chatId);
  if (aborter) {
    aborter.abort();
    activeLLMFetchRequests.delete(chatId);
  }
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
    clientReq,
  } = args;

  const { chat, prompt, getChat, llm_credential, llm_prompt_id } =
    await getValidatedAskLLMChatOptions(args);
  const getPastMessages = () =>
    dbs.llm_messages.find({ chat_id: chatId }, { orderBy: { created: 1 } });
  let pastMessages = await getPastMessages();

  /** It's crucial we reduce the posibility that a new user message fails to insert due to some non critical error */
  const {
    data: toolsWithInfo,
    error,
    hasError,
  } = await tryCatchV2(
    async () =>
      await getLLMToolsAllowedInThisChat({
        userType: user.type,
        dbs,
        chat,
        connectionId,
        clientReq,
      }),
  );
  if (hasError) {
    if (chat.agent_info) {
      throw error;
    }
    console.error("LLM Tools fetch error:", error);
  }

  const aborter = args.aborter ?? new AbortController();
  activeLLMFetchRequests.set(chat.id, aborter);
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
      aborter,
      clientReq,
    );
  }

  /** If user stopped chat must add tool use responses to prevent errors */
  const awaitingToolUseResult = pastMessages.flatMap(({ message }, index) => {
    const result = filterArr(message, {
      type: "tool_use",
    } as const).filter(
      (toolUse) =>
        !pastMessages
          .slice(index + 1)
          .some((maybeResponse) =>
            maybeResponse.message.some(
              (n) => n.type === "tool_result" && n.tool_use_id === toolUse.id,
            ),
          ),
    );
    return result;
  });
  if (awaitingToolUseResult.length && args.type === "new-message") {
    await dbs.llm_messages.insert({
      user_id: user.id,
      chat_id: chatId,
      message: awaitingToolUseResult.map((m) => ({
        type: "tool_result" as const,
        tool_name: m.name,
        tool_use_id: m.id,
        content:
          chat.status?.state === "stopped" ?
            "Tool use requests were stopped by the user"
          : "Tool use requests were interrupted by the user",
      })),
      llm_model_id: chat.model,
    });
    pastMessages = await getPastMessages();
  }

  if (args.type === "tool-use-result" && !awaitingToolUseResult.length) {
    // Chat might have since been stopped and other user messages were added
    return;
  }

  await dbs.llm_messages.insert({
    user_id: user.id,
    chat_id: chatId,
    message: userMessage,
    llm_model_id: chat.model,
  });
  if (type === "new-message") {
    await dbs.llm_chats.update(
      { id: chatId },
      {
        currently_typed_message: "",
      },
    );
  }

  if (type === "tool-use-result-with-denied") {
    return;
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

  const hasMessagesThatNeedsAIResponse = userMessage.some((m) => {
    if (m.type === "tool_result" && !m.is_error) {
      const toolNameParts = getMCPToolNameParts(m.tool_name);
      if (!toolNameParts) return true;
      const { serverName, toolName } = toolNameParts;
      /**
       * Somet of prostgles-ui tools don't need LLM response after their result
       */
      if (serverName === "prostgles-ui") {
        const toolDefinition = getProperty(
          PROSTGLES_MCP_SERVERS_AND_TOOLS[serverName],
          toolName,
        );
        return (
          toolDefinition &&
          "mode" in toolDefinition &&
          toolDefinition.mode === "user-provides-response"
        );
      }
    }
    return true;
  });
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

    await checkMaxCostLimitForChat(
      dbs,
      chat,
      modelData,
      pastMessages,
      userMessage,
    );

    const promptWithContext = await getFullPrompt({
      prompt,
      schema,
      connectionId,
    });

    const {
      llm_providers: [llm_provider],
      ...llm_model
    } = modelData;
    if (!llm_provider) throw "Provider not found";

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
    const gemini25BreakingChanges = llm_model.name.includes("gemini-2.5");
    const {
      content: aiResponseMessageRaw,
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
      aborter,
    });

    /** Move prostgles-ui tool_use messages to the end for better UX (because no tool result is expected) */
    const prostglesUIToolUse = filterArr(aiResponseMessageRaw, {
      type: "tool_use",
    } as const).filter(
      (m) =>
        getMCPToolNameParts(m.name)?.serverName ===
        ("prostgles-ui" satisfies keyof typeof PROSTGLES_MCP_SERVERS_AND_TOOLS),
    );
    const aiResponseMessage =
      !prostglesUIToolUse.length ? aiResponseMessageRaw : (
        [
          ...filterArrInverse(aiResponseMessageRaw, {
            type: "tool_use",
          } as const),
          ...prostglesUIToolUse,
        ]
      );

    await dbs.llm_messages.update(
      { id: aiResponseMessagePlaceholder.id },
      {
        message: aiResponseMessage,
        meta,
        cost,
      },
    );

    const { maximum_consecutive_tool_fails, agent_info } = chat;
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
      await dbs.llm_chats.update(
        { id: chat.id },
        {
          status: {
            state: "stopped",
            reason: "maximum_consecutive_tool_fails",
          },
        },
      );
      throw `Maximum number (${maximum_consecutive_tool_fails}) of failed consecutive tool requests reached`;
    }

    const { maxIterations } = agent_info ?? {};
    if (
      maxIterations !== undefined &&
      isAssistantMessageRequestingToolUse({ message: aiResponseMessage })
    ) {
      const iterations =
        pastMessages.filter((m) => {
          return !m.user_id;
        }).length +
        1; /** +1 for current response that is requesting tool use */
      if (iterations > maxIterations) {
        await dbs.llm_chats.update(
          { id: chat.id },
          {
            status: {
              state: "stopped",
              reason: "max_iterations_reached",
            },
          },
        );
        throw `Maximum number (${maxIterations}) of iterations reached`;
      }
    }

    const latestChat = await getChat();
    if (!latestChat) {
      throw "Chat not found after LLM response";
    }

    const newToolUseMessages = filterArr(aiResponseMessage, {
      type: "tool_use",
    } as const);
    if (newToolUseMessages.length) {
      await runApprovedTools(
        toolsWithInfo,
        args,
        latestChat,
        newToolUseMessages,
        undefined,
        aborter,
        clientReq,
      );
    }
  } catch (err) {
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
      isObject(err) && err.name === "AbortError" ?
        "Response generation was aborted by user."
      : errorIsString ? errorText
      : ["```json", errorText, "```"].join("\n"),
    ].join(".\n");
    await dbs.llm_messages.update(
      { id: aiResponseMessagePlaceholder.id },
      {
        message: [{ type: "text", text: messageText }],
      },
    );
  }

  if ((await getChat())?.status?.state === "loading") {
    await dbs.llm_chats.update(
      { id: chatId },
      {
        status: null,
      },
    );
  }
};
