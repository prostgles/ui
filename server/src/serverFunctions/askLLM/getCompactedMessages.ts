import { filterArr } from "@common/llmUtils";
import { type PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { JSONBTypeIfDefined } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServerTypes";
import { isDefined } from "prostgles-types";
import type { LLMMessageWithRole } from "./fetchLLMResponse";
import { getProstglesMCPFullToolName } from "@common/mcpUtils";

type CompactionInput = JSONBTypeIfDefined<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["compact_context"]["schema"]
>;
export const getCompactedMessages = ({
  nonEmptyMessages,
}: {
  nonEmptyMessages: LLMMessageWithRole[];
}) => {
  const successfulCompactionIds = new Set(
    nonEmptyMessages.flatMap(({ content }) =>
      filterArr(content, { type: "tool_result" as const })
        .filter(
          (result) =>
            result.tool_name === compactionToolName && !result.is_error,
        )
        .map((result) => result.tool_use_id),
    ),
  );
  const getCompactionToolUse = (
    message: (typeof nonEmptyMessages)[number],
    type: "conversation" | "previous-message",
  ) =>
    filterArr(message.content, { type: "tool_use" as const }).findLast(
      (c) =>
        c.name === compactionToolName &&
        successfulCompactionIds.has(c.id) &&
        (c.input as CompactionInput).type === type,
    );

  const lastConversationCompactionIndex = nonEmptyMessages.findLastIndex((m) =>
    getCompactionToolUse(m, "conversation"),
  );
  const lastUserMessageBeforeCompactionIndex = nonEmptyMessages.findLastIndex(
    (message, index) =>
      index < lastConversationCompactionIndex &&
      message.role === "user" &&
      message.content.some((item) => item.type === "text"),
  );

  const messagesAfterCompaction: LLMMessageWithRole[] = nonEmptyMessages
    .map((message, index) => {
      if (message.role === "system") {
        return message;
      }

      if (index < lastConversationCompactionIndex) {
        const userText =
          index === lastUserMessageBeforeCompactionIndex ?
            filterArr(message.content, { type: "text" as const })
          : [];
        return userText.length ? { ...message, content: userText } : undefined;
      }

      /* Remove only successful compaction calls and their matching results. */
      let content = message.content.filter((item) =>
        item.type === "tool_use" ? !successfulCompactionIds.has(item.id)
        : item.type === "tool_result" ?
          !successfulCompactionIds.has(item.tool_use_id)
        : true,
      );
      if (index === lastConversationCompactionIndex) {
        const conversationSummary = getCompactionToolUse(
          message,
          "conversation",
        );
        content = [
          {
            type: "text",
            text: `Previous messages have been compacted to reduce context length. Summary: ${conversationSummary?.input!.summary}`,
          },
          ...content,
        ];
      }

      const nextMessage = nonEmptyMessages[index + 1];
      const hasCompactionToolUse =
        !nextMessage ? undefined : (
          getCompactionToolUse(nextMessage, "previous-message")
        );
      if (hasCompactionToolUse) {
        const summary = hasCompactionToolUse.input!.summary;
        let summaryIncluded = false;
        content = content.flatMap((c): LLMMessageWithRole["content"] => {
          /* Keep tool calls paired with their results, even when compacting an assistant message. */
          if (
            c.type === "tool_use" ||
            (message.role === "user" && c.type === "text")
          ) {
            return [c];
          }
          const text =
            summaryIncluded ? undefined
            : `This message has been compacted to reduce context length. Summary: ${summary}`;
          summaryIncluded = true;
          if (c.type === "tool_result") {
            return [{ ...c, content: text ?? "Compacted." }];
          }
          return text ? [{ type: "text", text }] : [];
        });
      }

      return content.length ? { ...message, content } : undefined;
    })
    .filter(isDefined);

  return { messagesAfterCompaction };
};

const compactionToolName = getProstglesMCPFullToolName(
  "prostgles-ui",
  "compact_context",
);
