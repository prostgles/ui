import {
  getMCPFullToolName,
  type PROSTGLES_MCP_SERVERS_AND_TOOLS,
} from "@common/prostglesMcp";
import type { LLMMessageWithRole } from "./fetchLLMResponse";
import { filterArr } from "@common/llmUtils";
import { isDefined } from "prostgles-types";
import type { JSONBTypeIfDefined } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServerTypes";

type CompactionInput = JSONBTypeIfDefined<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["compact_context"]["schema"]
>;
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
      (c) =>
        c.name === compactionToolName &&
        (c.input as CompactionInput).type === type,
    );

  const lastConversationCompactionIndex = nonEmptyMessages.findLastIndex((m) =>
    getCompactionToolUse(m, "conversation"),
  );
  const lastConversationCompactionMessage =
    nonEmptyMessages[lastConversationCompactionIndex];

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
          const conversationSummary = getCompactionToolUse(
            lastConversationCompactionMessage,
            "conversation",
          );
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

      const nextMessage = nonEmptyMessages[index + 1];
      const hasCompactionToolUse =
        !nextMessage ? undefined : (
          getCompactionToolUse(nextMessage, "previous-message")
        );
      if (hasCompactionToolUse) {
        const summary = hasCompactionToolUse.input!.summary;
        return {
          ...message,
          content: message.content.map((c) => {
            const text = `This message has been compacted to reduce context length. Summary: ${summary}`;
            if (c.type === "tool_result") {
              return {
                ...c,
                content: text,
              };
            }
            return {
              type: "text",
              text,
            };
          }),
        } satisfies LLMMessageWithRole;
      }

      return message;
    })
    .filter(isDefined);

  return { messagesAfterCompaction };
};
