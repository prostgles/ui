import { mdiBrain, mdiDelete } from "@mdi/js";
import React, { useMemo } from "react";
import {
  filterArr,
  filterArrInverse,
} from "../../../../../../commonTypes/llmUtils";
import type { DBSSchema } from "../../../../../../commonTypes/publishUtils";
import Btn from "../../../../components/Btn";
import type { Message } from "../../../../components/Chat/Chat";
import { Marked } from "../../../../components/Chat/Marked";
import Chip from "../../../../components/Chip";
import { CopyToClipboardBtn } from "../../../../components/CopyToClipboardBtn";
import ErrorComponent from "../../../../components/ErrorComponent";
import Expander from "../../../../components/Expander";
import { FlexCol, FlexRow } from "../../../../components/Flex";
import Loading from "../../../../components/Loading";
import { MediaViewer } from "../../../../components/MediaViewer";
import Select from "../../../../components/Select/Select";
import { t } from "../../../../i18n/i18nUtils";
import { isDefined } from "../../../../utils";
import { Counter } from "../../../W_SQL/W_SQL";
import type { UseLLMChatProps } from "../useLLMChat";
import { ToolUseChatMessage } from "./ToolUseChatMessage";

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
  const { data: llmMessages } = dbs.llm_messages.useSubscribe(
    { chat_id: activeChat?.id },
    { orderBy: { created: 1 } },
    { skip: !activeChat?.id },
  );

  const isLoadingSince = status?.state === "loading" ? status.since : null;
  const sqlHandler = db.sql;

  const actualMessages: Message[] | undefined = useMemo(
    () =>
      llmMessages
        ?.map(
          ({ id, user_id, created, message, meta, cost }, llmMessageIdx) => {
            const isLastMessage = llmMessages.length - 1 === llmMessageIdx;
            const messagesWithoutToolResponses = filterArrInverse(message, {
              type: "tool_result",
            } as const);
            if (!messagesWithoutToolResponses.length) {
              return undefined;
            }

            const messageNode = messagesWithoutToolResponses.map((m, idx) => {
              if (m.type === "text" && "text" in m) {
                return (
                  <React.Fragment key={`${id}-${m.type}-${idx}`}>
                    {m.reasoning && (
                      <Expander
                        getButton={() => (
                          <Btn
                            title="Reasoning"
                            iconPath={mdiBrain}
                            variant="faded"
                          >
                            Reasoning...
                          </Btn>
                        )}
                      >
                        <Marked
                          key={`${id}-reasoning-${idx}`}
                          codeHeader={undefined}
                          content={m.reasoning}
                          sqlHandler={sqlHandler}
                          loadedSuggestions={loadedSuggestions}
                        />
                      </Expander>
                    )}
                    <Marked
                      key={`${id}-text-${idx}`}
                      codeHeader={undefined}
                      content={m.text}
                      sqlHandler={sqlHandler}
                      loadedSuggestions={loadedSuggestions}
                    />
                  </React.Fragment>
                );
              }
              if (m.type !== "tool_use") {
                return (
                  <MediaViewer
                    key={`${id}-${m.type}-${idx}`}
                    url={m.source.data}
                    style={{
                      maxHeight: "200px",
                      maxWidth: "fit-content",
                      border: "1px solid var(--b-color)",
                    }}
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
                  loadedSuggestions={loadedSuggestions}
                  workspaceId={workspaceId}
                  mcpServerIcons={mcpServerIcons}
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

            const isLoading = Boolean(isLastMessage && isLoadingSince);
            const costNum = cost ? parseFloat(cost) : 0;
            return {
              id,
              incoming: user_id !== user?.id,
              messageTopContent: (
                <FlexRow className="show-on-parent-hover f-1 gap-p25">
                  {!user_id && (
                    <Chip
                      className="ml-p5"
                      title={JSON.stringify({ cost, ...meta }, null, 2)}
                    >
                      {`$${costNum.toFixed(!costNum ? 0 : 2)}`}
                    </Chip>
                  )}
                  <Select
                    title={t.common.Delete + "..."}
                    fullOptions={[
                      {
                        key: "thisMessage",
                        label: "Delete this message",
                      },
                      {
                        key: "allToBottom",
                        label: "Delete this and all following messages",
                      },
                    ]}
                    btnProps={{
                      size: "micro",
                      variant: "icon",
                      iconPath: mdiDelete,
                      children: "",
                    }}
                    onChange={async (option) => {
                      if (option === "thisMessage") {
                        await dbs.llm_messages.delete({ id });
                      } else {
                        await dbs.llm_messages.delete({
                          chat_id: activeChat?.id,
                          created: {
                            $gte: created,
                          },
                        });
                      }
                    }}
                    className="ml-auto"
                  />
                  {textMessageToCopy && (
                    <CopyToClipboardBtn
                      content={textMessageToCopy}
                      size="micro"
                      // style={{
                      //   top: "0.25em",
                      //   right: "0.25em",
                      //   position: "absolute",
                      // }}
                    />
                  )}
                </FlexRow>
              ),
              message: (
                <FlexCol>
                  {messageNode}
                  {isLoading && (
                    <>
                      <Loading />
                      <Counter from={new Date(isLoadingSince!)} />
                    </>
                  )}
                  {meta?.stop_reason?.toLowerCase() === "max_tokens" && (
                    <ErrorComponent
                      error={`stop_reason: "max_tokens".\n\nThe response was cut off because it reached the maximum token limit`}
                    />
                  )}
                </FlexCol>
              ),
              // isLoading,
              sender_id: user_id || "ai",
              sent: new Date(created || new Date()),
            };
          },
        )
        .filter(isDefined),
    [
      llmMessages,
      isLoadingSince,
      user?.id,
      sqlHandler,
      loadedSuggestions,
      workspaceId,
      dbs.llm_messages,
      activeChat?.id,
      mcpServerIcons,
    ],
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
