import { filterArrInverse } from "@common/llmUtils";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import Loading from "@components/Loader/Loading";
import { SvgIcon } from "@components/SvgIcon";
import { isEqual } from "prostgles-types";
import React, { memo, useMemo } from "react";
import { Counter } from "src/dashboard/W_SQL/W_SQL";
import { isDefined } from "src/utils";
import type { UseLLMChatProps } from "../useLLMChat";
import type {
  LLMMessageGroup,
  LLMMessageItem,
  LLMSingleMessage,
} from "./hooks/useLLMChatMessageGrouper";
import { LLMChatMessageContent } from "./LLMChatMessageContent";
import { LLMChatMessageContentText } from "./LLMChatMessageContentText";
import { getIconForToolUseMessage } from "./ToolUseChatMessage/useToolUseChatMessage";

type CommonProps = Pick<
  UseLLMChatProps,
  "db" | "mcpServerIcons" | "workspaceId" | "loadedSuggestions"
>;

type P = CommonProps & {
  messageItem: LLMMessageItem;
  isLoadingSinceDate: Date | undefined;
};

export const LLMChatMessage = memo(
  (props: P) => {
    const {
      messageItem,
      isLoadingSinceDate,
      db,
      mcpServerIcons,
      loadedSuggestions,
      workspaceId,
    } = props;

    const message =
      messageItem.type === "single_message" ?
        messageItem.message
      : messageItem.firstMessage;
    const { id, meta } = message;
    return (
      <FlexCol>
        {messageItem.type === "single_message" ?
          <SingleMessage
            key={`${id}-single_message `}
            messageItem={messageItem}
            mcpServerIcons={mcpServerIcons}
            workspaceId={workspaceId}
            db={db}
            loadedSuggestions={loadedSuggestions}
          />
        : <GroupMessage
            messageItem={messageItem}
            mcpServerIcons={mcpServerIcons}
            db={db}
            loadedSuggestions={loadedSuggestions}
          />
        }
        {isLoadingSinceDate && (
          <>
            <Loading />
            <Counter from={isLoadingSinceDate} />
          </>
        )}
        {(meta?.stop_reason as string | undefined)?.toLowerCase() ===
          "max_tokens" && (
          <ErrorComponent
            error={`stop_reason: "max_tokens".\n\nThe response was cut off because it reached the maximum token limit`}
          />
        )}
      </FlexCol>
    );
  },
  (prev, next) => {
    const areEqual = isEqual(prev, next);
    return areEqual;
  },
);

const SingleMessage = ({
  messageItem,
  db,
  mcpServerIcons,
  workspaceId,
  loadedSuggestions,
}: { messageItem: LLMSingleMessage } & CommonProps) => {
  const { message: llmMessage, nextMessage } = messageItem;
  const { id, message } = llmMessage;
  const nonToolResultMessages = filterArrInverse(message, {
    type: "tool_result",
  } as const);
  if (!nonToolResultMessages.length) {
    return null;
  }

  return (
    <>
      {nonToolResultMessages.map((messageContent, idx) => {
        return (
          <LLMChatMessageContent
            key={`${id}-${messageContent.type}-${idx}`}
            messageContent={messageContent}
            messageContentIndex={idx}
            message={llmMessage}
            nextMessage={nextMessage}
            db={db}
            workspaceId={workspaceId}
            loadedSuggestions={loadedSuggestions}
            mcpServerIcons={mcpServerIcons}
          />
        );
      })}
    </>
  );
};

const GroupMessage = ({
  messageItem,
  mcpServerIcons,
  db,
  loadedSuggestions,
}: { messageItem: LLMMessageGroup } & Pick<
  CommonProps,
  "mcpServerIcons" | "db" | "loadedSuggestions"
>) => {
  const icons = useMemo(() => {
    const iconPaths = messageItem.messages.flatMap(({ message }) => {
      return message.message
        .map((m) => {
          if (m.type === "tool_use") {
            return getIconForToolUseMessage(m, mcpServerIcons);
          }
        })
        .filter(isDefined);
    });
    return Array.from(new Set(iconPaths)).slice(0, 5);
  }, [messageItem, mcpServerIcons]);

  const textMessages = useMemo(() => {
    return messageItem.messages
      .flatMap(({ message }) =>
        message.message.map((m) => {
          if (m.type === "text" && "text" in m && m.text) {
            return m;
          }
        }),
      )
      .filter(isDefined);
  }, [messageItem]);
  const firstTextMessage = textMessages[0];
  const lastTextMessage = textMessages.at(-1);

  return (
    <>
      {firstTextMessage && (
        <LLMChatMessageContentText
          messageContent={firstTextMessage}
          db={db}
          loadedSuggestions={loadedSuggestions}
        />
      )}
      <Btn
        variant="faded"
        size="small"
        onClick={messageItem.onToggle}
        data-command="ToolUseMessage.toggleGroup"
      >
        {icons.map((iconPath) => {
          return <SvgIcon key={iconPath} icon={iconPath} />;
        })}
        {messageItem.messages.length} tool calls
      </Btn>
      {lastTextMessage && (
        <LLMChatMessageContentText
          messageContent={lastTextMessage}
          db={db}
          loadedSuggestions={loadedSuggestions}
        />
      )}
    </>
  );
};
