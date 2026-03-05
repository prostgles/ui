import {
  getMCPFullToolName,
  type PROSTGLES_MCP_SERVERS_AND_TOOLS,
} from "@common/prostglesMcp";
import type { LLMMessageWithRole } from "./fetchLLMResponse";
import { filterArr } from "@common/llmUtils";
import { isDefined } from "prostgles-types";

export const getCompactedMessages = ({
  nonEmptyMessages,
}: {
  nonEmptyMessages: LLMMessageWithRole[];
}) => {
  const compactionToolName = getMCPFullToolName(
    "prostgles-ui",
    "compact_context" satisfies keyof (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"],
  );

  const getCompactionToolUse = (
    message: (typeof nonEmptyMessages)[number],
    type: "conversation" | "previous-message",
  ) =>
    filterArr(message.content, { type: "tool_use" as const }).find(
      (c) => c.name === compactionToolName && c.input?.compaction_type === type,
    );

  const lastConversationCompactionIndex = nonEmptyMessages.findLastIndex((m) =>
    getCompactionToolUse(m, "conversation"),
  );
  const lastConversationCompactionMessage =
    nonEmptyMessages[lastConversationCompactionIndex];

  const conversationSummary =
    lastConversationCompactionMessage &&
    getCompactionToolUse(lastConversationCompactionMessage, "conversation");

  const messagesAfterCompaction: LLMMessageWithRole[] = nonEmptyMessages
    .map((message, index) => {
      if (message.role === "system" || index === 0) {
        return message;
      }

      if (
        lastConversationCompactionMessage &&
        lastConversationCompactionIndex !== -1
      ) {
        if (index < lastConversationCompactionIndex) {
          return undefined;
        }
        if (index === lastConversationCompactionIndex) {
          return {
            ...message,
            content: [
              {
                type: "text",
                text: `Previous messages have been compacted to reduce context length. Summary: ${conversationSummary?.input!.summary}`,
              },
            ],
          } satisfies LLMMessageWithRole;
        }
      }

      const isMessageSummaryToolUse = getCompactionToolUse(
        message,
        "previous-message",
      );
      if (isMessageSummaryToolUse) {
        return;
      }

      const prevMessage = nonEmptyMessages[index - 1];
      const previousMessageCompaction =
        prevMessage && getCompactionToolUse(prevMessage, "previous-message");
      if (previousMessageCompaction) {
        return {
          role: "user",
          content: [
            {
              type: "text",
              text: `Previous message has been compacted to reduce context length. Summary: ${previousMessageCompaction.input!.summary}`,
            },
          ],
        } satisfies LLMMessageWithRole;
      }

      return message;
    })
    .filter(isDefined);

  return { messagesAfterCompaction };
};
