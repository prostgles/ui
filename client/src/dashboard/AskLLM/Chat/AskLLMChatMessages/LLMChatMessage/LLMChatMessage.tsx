import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import Loading from "@components/Loader/Loading";
import { isEqual } from "prostgles-types";
import React, { memo } from "react";
import { Counter } from "src/dashboard/W_SQL/W_SQL";
import type { UseLLMChatProps } from "../../useLLMChat";
import type { LLMMessageItem } from "../hooks/useLLMChatMessageGrouper";
import { LLMGroupedToolCallsMessage } from "./LLMGroupedToolCallsMessage";
import { LLMSingleChatMessage } from "./LLMSingleChatMessage";

export type LLMChatMessageCommonProps = Pick<
  UseLLMChatProps,
  "db" | "mcpServerIcons" | "workspaceId" | "loadedSuggestions"
>;

type P = LLMChatMessageCommonProps & {
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
          <LLMSingleChatMessage
            key={`${id}-single_message `}
            messageItem={messageItem}
            mcpServerIcons={mcpServerIcons}
            workspaceId={workspaceId}
            db={db}
            loadedSuggestions={loadedSuggestions}
          />
        : <LLMGroupedToolCallsMessage
            messages={messageItem.messages}
            messageContentItems={messageItem.messageContentItems}
            onToggle={messageItem.onToggle}
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
