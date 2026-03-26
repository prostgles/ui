import { filterArrInverse } from "@common/llmUtils";
import type { LLMSingleMessage } from "../hooks/useLLMChatMessageGrouper";
import type { LLMChatMessageCommonProps } from "./LLMChatMessage";
import { LLMChatMessageContent } from "./LLMChatMessageContent";
import React from "react";
import ErrorComponent from "@components/ErrorComponent";

export const LLMSingleChatMessage = ({
  messageItem,
  workspaceId,
  loadedSuggestions,
}: { messageItem: LLMSingleMessage } & LLMChatMessageCommonProps) => {
  const { message: llmMessage, nextMessage } = messageItem;
  const { id, message } = llmMessage;
  const nonToolResultMessages = filterArrInverse(message, {
    type: "tool_result",
  } as const);

  if (!message.length) {
    return <ErrorComponent error="Message has no content" />;
  }

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
            workspaceId={workspaceId}
            loadedSuggestions={loadedSuggestions}
          />
        );
      })}
    </>
  );
};
