import React, { useMemo } from "react";
import { filterArrInverse } from "../../../../commonTypes/llmUtils";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import type { Message } from "../../components/Chat/Chat";
import { Marked } from "../../components/Chat/Marked";
import { FlexCol } from "../../components/Flex";
import { MediaViewer } from "../../components/MediaViewer";
import { isDefined } from "../../utils";
import { AskLLMTokenUsage } from "./AskLLMTokenUsage";
import { ToolUseChatMessage } from "./ToolUseChatMessage";
import type { UseLLMChatProps } from "./useLLMChat";
import { useMarkdownCodeHeader } from "./useMarkdownCodeHeader";

type P = UseLLMChatProps & {
  activeChat: DBSSchema["llm_chats"] | undefined;
};

export const useLLMChatMessages = (props: P) => {
  const { dbs, user, activeChat, db } = props;

  const { data: llmMessages } = dbs.llm_messages.useSubscribe(
    { chat_id: activeChat?.id },
    { orderBy: { created: 1 } },
    { skip: !activeChat?.id },
  );

  const { data: models } = dbs.llm_models.useFind();

  const { markdownCodeHeader } = useMarkdownCodeHeader(props);
  const sqlHandler = db.sql;

  const actualMessages: Message[] | undefined = useMemo(
    () =>
      llmMessages
        ?.map(
          (
            { id, user_id, created, message, meta, is_loading },
            llmMessageIdx,
          ) => {
            const messagesWithoutToolResponses = filterArrInverse(message, {
              type: "tool_result",
            } as const);
            if (!messagesWithoutToolResponses.length) {
              return undefined;
            }

            const messageNode = messagesWithoutToolResponses.map((m, idx) => {
              if (m.type === "text") {
                return (
                  <Marked
                    key={`${id}-text-${idx}`}
                    codeHeader={markdownCodeHeader}
                    content={m.text}
                    sqlHandler={sqlHandler}
                  />
                );
              }
              if (m.type === "image") {
                return (
                  <MediaViewer
                    key={`${id}-image-${idx}`}
                    url={m.source.data}
                    content_type="image"
                  />
                );
              }

              return (
                <ToolUseChatMessage
                  key={`${id}-tool-${idx}`}
                  messageIndex={llmMessageIdx}
                  messages={llmMessages}
                  toolUseMessageIndex={idx}
                  sqlHandler={sqlHandler}
                />
              );
            });

            return {
              id,
              incoming: user_id !== user?.id,
              messageTopContent: (
                <AskLLMTokenUsage
                  className="ml-p5"
                  message={{ user_id, meta }}
                  models={models ?? []}
                />
              ),
              message: <FlexCol>{messageNode}</FlexCol>,
              isLoading: !!is_loading,
              sender_id: user_id || "ai",
              sent: new Date(created || new Date()),
            };
          },
        )
        .filter(isDefined),
    [sqlHandler, llmMessages, markdownCodeHeader, models, user?.id],
  );

  const disabled_message =
    (
      activeChat?.disabled_until &&
      new Date(activeChat.disabled_until) > new Date() &&
      activeChat.disabled_message
    ) ?
      activeChat.disabled_message
    : undefined;

  const messages: Message[] = (
    actualMessages?.length ? actualMessages : (
      [
        {
          id: "first",
          message: "Hello, I am the AI assistant. How can I help you?",
          incoming: true,
          sent: new Date("2024-01-01"),
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
          sent: new Date(),
        },
      ]
    : [],
  );

  return {
    llmMessages,
    messages: activeChat && actualMessages ? messages : undefined,
  };
};
