import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import Loading from "@components/Loader/Loading";
import React, { memo } from "react";
import { Counter } from "src/dashboard/W_SQL/W_SQL";
import type { UseLLMChatProps } from "../../useLLMChat";
import type { LLMMessageItem } from "../hooks/useLLMChatMessageGrouper";
import { LLMGroupedToolCallsMessage } from "./LLMGroupedToolCallsMessage";
import { LLMSingleChatMessage } from "./LLMSingleChatMessage";
import { isEqual } from "prostgles-types";

export type LLMChatMessageCommonProps = Pick<
  UseLLMChatProps,
  "workspaceId" | "loadedSuggestions"
>;

type P = LLMChatMessageCommonProps & {
  messageItem: LLMMessageItem;
  isLoadingSinceDate: Date | undefined;
  hideLoadingCounter: boolean;
};

export const LLMChatMessage = memo(
  (props: P) => {
    const {
      messageItem,
      isLoadingSinceDate,
      loadedSuggestions,
      workspaceId,
      hideLoadingCounter,
    } = props;

    const message =
      messageItem.type === "single_message" ?
        messageItem.message
      : messageItem.messages[0].message;
    const { id, meta } = message;
    return (
      <FlexCol>
        {messageItem.type === "single_message" ?
          <LLMSingleChatMessage
            key={`${id}-single_message `}
            messageItem={messageItem}
            workspaceId={workspaceId}
            loadedSuggestions={loadedSuggestions}
          />
        : <LLMGroupedToolCallsMessage
            messages={messageItem.messages}
            onToggle={messageItem.onToggle}
            loadedSuggestions={loadedSuggestions}
          />
        }
        {isLoadingSinceDate && (
          <>
            <Loading />
            {hideLoadingCounter ? null : <Counter from={isLoadingSinceDate} />}
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
    try {
      const areEqual = isEqual(prev, next); //"error"
      return areEqual;
    } catch (e) {
      console.error("Error comparing LLMChatMessage props:", e);
      return false; // If there's an error during comparison, re-render the component
    }
  },
);
