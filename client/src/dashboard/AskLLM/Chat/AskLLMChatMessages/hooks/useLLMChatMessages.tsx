import type { DBSSchema } from "@common/publishUtils";
import type { Message } from "@components/Chat/Chat";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import { FormFieldDebounced } from "@components/FormField/FormFieldDebounced";
import React, { useMemo } from "react";
import { isDefined } from "../../../../../utils/utils";
import type { UseLLMChatProps } from "../../useLLMChat";
import { LLMChatMessage } from "../LLMChatMessage/LLMChatMessage";
import { LLMChatMessageHeader } from "../LLMChatMessage/LLMChatMessageHeader";
import { useLLMChatMessageGrouper } from "./useLLMChatMessageGrouper";

type P = UseLLMChatProps & {
  activeChat: DBSSchema["llm_chats"] | undefined;
};

export const useLLMChatMessages = (props: P) => {
  const {
    dbs,
    user,
    activeChat,
    db,
    loadedSuggestions,
    workspaceId,
    mcpServerIcons,
  } = props;
  const { status } = activeChat ?? {};
  // TODO: llmMessages is changed on each render
  const { data: llmMessages } = dbs.llm_messages.useSubscribe(
    { chat_id: activeChat?.id },
    { orderBy: { created: 1 } },
    { skip: !activeChat?.id },
  );

  const isLoadingSince = status?.state === "loading" ? status.since : null;
  const { llmMessagesWithGroups } = useLLMChatMessageGrouper({
    llmMessages,
  });
  const actualMessages: Message[] | undefined = useMemo(
    () =>
      !llmMessages ? undefined : (
        llmMessagesWithGroups
          ?.map((messageItem, messageOrGroupIndex) => {
            const isLastMessage =
              llmMessagesWithGroups.length - 1 === messageOrGroupIndex;
            const { id, user_id } =
              messageItem.type === "single_message" ?
                messageItem.message
              : messageItem.firstMessage;
            const isLoadingSinceDate =
              !isLastMessage || !isLoadingSince ?
                undefined
              : new Date(isLoadingSince);
            return {
              id,
              incoming: user_id !== user?.id,
              messageTopContent: (
                <LLMChatMessageHeader dbs={dbs} item={messageItem} />
              ),
              message: (
                <LLMChatMessage
                  isLoadingSinceDate={isLoadingSinceDate}
                  messageItem={messageItem}
                  db={db}
                  mcpServerIcons={mcpServerIcons}
                  workspaceId={workspaceId}
                  loadedSuggestions={loadedSuggestions}
                />
              ),
              sender_id: user_id || "ai",
            };
          })
          .filter(isDefined)
      ),
    [
      llmMessages,
      llmMessagesWithGroups,
      isLoadingSince,
      user?.id,
      dbs,
      db,
      workspaceId,
      loadedSuggestions,
      mcpServerIcons,
    ],
  );

  const lastMessage = llmMessages?.at(-1);
  const disabled_message =
    (
      activeChat?.disabled_until &&
      new Date(activeChat.disabled_until) > new Date() &&
      activeChat.disabled_message
    ) ?
      activeChat.disabled_message
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    : lastMessage?.meta?.finish_reason === "length" ?
      <FlexCol>
        <ErrorComponent
          error={"finish_reason = 'length'. Increase max_tokens and try again"}
        />
        <FormFieldDebounced
          label={"Max tokens"}
          value={
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            activeChat?.extra_body?.max_tokens ||
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            lastMessage.meta?.max_tokens ||
            6000
          }
          onChange={(max_tokens) => {
            void dbs.llm_chats.update(
              { id: activeChat!.id },
              { extra_body: { max_tokens: Number(max_tokens) } },
            );
          }}
        />
      </FlexCol>
    : undefined;

  const messages: Message[] = (
    actualMessages?.length ? actualMessages : (
      [
        {
          id: "first",
          message: "Hello, I am the AI assistant. How can I help you?",
          incoming: true,
          sender_id: "ai",
        } as const,
      ].map((m) => {
        const incoming = m.sender_id !== user?.id;
        return {
          ...m,
          incoming,
          message: m.message,
        };
      })
    )).concat(
    disabled_message ?
      [
        {
          id: "disabled-last",
          incoming: true,
          message: disabled_message,
          sender_id: "ai",
        },
      ]
    : [],
  );

  return {
    llmMessages,
    messages: activeChat && actualMessages ? messages : undefined,
  };
};
