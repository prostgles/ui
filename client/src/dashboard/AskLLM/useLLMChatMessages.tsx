import React, { useMemo } from "react";
import { filterArr, filterArrInverse } from "../../../../commonTypes/llmUtils";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import type { Message } from "../../components/Chat/Chat";
import { Marked } from "../../components/Chat/Marked";
import { CopyToClipboardBtn } from "../../components/CopyToClipboardBtn";
import { FlexCol } from "../../components/Flex";
import Loading from "../../components/Loading";
import { MediaViewer } from "../../components/MediaViewer";
import { isDefined } from "../../utils";
import { Counter } from "../W_SQL/W_SQL";
import { AskLLMTokenUsage } from "./AskLLMTokenUsage";
import { ToolUseChatMessage } from "./ToolUseChatMessage";
import type { UseLLMChatProps } from "./useLLMChat";
import { useMarkdownCodeHeader } from "./useMarkdownCodeHeader";

type P = UseLLMChatProps & {
  activeChat: DBSSchema["llm_chats"] | undefined;
};

export const useLLMChatMessages = (props: P) => {
  const { dbs, user, activeChat, db } = props;
  const { is_loading } = activeChat ?? {};
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
        ?.map(({ id, user_id, created, message, meta }, llmMessageIdx) => {
          const isLastMessage = llmMessages.length - 1 === llmMessageIdx;
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

          const textMessages = filterArr(message, {
            type: "text",
          } as const);
          const textMessageToCopy =
            textMessages.length && textMessages.length === message.length ?
              textMessages.map((m) => m.text).join("\n")
            : undefined;

          const isLoading = Boolean(isLastMessage && is_loading);
          return {
            id,
            incoming: user_id !== user?.id,
            messageTopContent: (
              <>
                <AskLLMTokenUsage
                  className="ml-p5"
                  message={{ user_id, meta }}
                  models={models ?? []}
                />
                {textMessageToCopy && (
                  <CopyToClipboardBtn
                    className="show-on-parent-hover"
                    content={textMessageToCopy}
                    size="micro"
                    style={{
                      top: "0.25em",
                      right: "0.25em",
                      position: "absolute",
                    }}
                  />
                )}
              </>
            ),
            message: (
              <FlexCol>
                {messageNode}
                {isLoading && (
                  <>
                    <Loading /> <Counter from={new Date(is_loading!)} />
                  </>
                )}
              </FlexCol>
            ),
            // isLoading,
            sender_id: user_id || "ai",
            sent: new Date(created || new Date()),
          };
        })
        .filter(isDefined),
    [llmMessages, user?.id, models, is_loading, sqlHandler, markdownCodeHeader],
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
