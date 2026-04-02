import type { DBSSchema } from "@common/publishUtils";
import { useMemo, useState } from "react";
import { ProstglesMCPToolsWithUI } from "../ProstglesToolUseMessage/ProstglesToolUseMessage";

type P = {
  llmMessages: DBSSchema["llm_messages"][] | undefined;
};

/**
 * Given a list of LLM messages, groups sequential tool use & tool result messages together
 * into a single message object for rendering in the chat UI.
 */
export const useLLMChatMessageGrouper = (props: P) => {
  const { llmMessages } = props;

  const [toggledSections, setToggledSections] = useState<Set<string>>(
    new Set(),
  );
  const llmMessagesWithGroups = useMemo(() => {
    if (!llmMessages) return;
    const result: LLMMessageItem[] = [];
    llmMessages.forEach((message, index) => {
      const prevItem = result.at(-1);
      const isToolResult = message.message.some(
        (m) => m.type === "tool_result",
      );
      if (isToolResult) return; // Skip rendering tool result messages directly
      const hasToolUseOrResult = message.message.some(
        (m) => m.type === "tool_use" || m.type === "tool_result",
      );
      const nextMessage = llmMessages[index + 1];

      /** Start or continue group */
      if (hasToolUseOrResult) {
        /** Continue group */
        if (prevItem?.type === "tool_call_message_group") {
          prevItem.messages = [...prevItem.messages, { message, nextMessage }];
        } else {
          /** Start new group */
          result.push({
            type: "tool_call_message_group",
            messages: [{ message, nextMessage }],
            startId: message.id,
            onToggle: () => {
              setToggledSections((prev) => {
                const newSet = new Set(prev);
                newSet.add(message.id);
                return newSet;
              });
            },
          });
        }
      } else {
        /** Regular single message */
        result.push({
          type: "single_message",
          message,
          nextMessage,
          onToggle: undefined,
        });
      }
    });

    const resultWithExpands: LLMMessageItem[] = result
      .map((item) => {
        if (item.type === "single_message") {
          return [item];
        }

        const toolCalls = getMessageContentItems(item).filter(
          (m) => m.type === "tool_use",
        );
        const allowMinimise =
          toolCalls.length >= 2 &&
          !toolCalls.some(
            (m) => ProstglesMCPToolsWithUI[m.name]?.displayMode === "full",
          );
        const shouldExpand =
          !allowMinimise || toggledSections.has(item.startId);

        if (!shouldExpand) {
          return [item];
        }
        return item.messages.map(
          ({ message, nextMessage }) =>
            ({
              type: "single_message",
              message,
              nextMessage,
              onToggle:
                toggledSections.has(message.id) ?
                  () => {
                    setToggledSections((prev) => {
                      const newSet = new Set(prev);
                      newSet.delete(message.id);
                      return newSet;
                    });
                  }
                : undefined,
            }) satisfies LLMMessageItem,
        );
      })
      .flat();

    return resultWithExpands;
  }, [llmMessages, toggledSections]);

  return {
    llmMessagesWithGroups,
  };
};

type LLMMessagePair = {
  message: DBSSchema["llm_messages"];
  nextMessage: DBSSchema["llm_messages"] | undefined;
};
export type LLMSingleMessage = LLMMessagePair & {
  type: "single_message";
  onToggle: undefined | (() => void);
};

export type LLMMessageGroup = {
  type: "tool_call_message_group";
  messages: [LLMMessagePair, ...LLMMessagePair[]];
  startId: string;
  onToggle: () => void;
};
export const getMessageContentItems = ({
  messages,
}: Pick<LLMMessageGroup, "messages">) =>
  messages.flatMap(({ message }) => message.message);
export type LLMMessageItem = LLMSingleMessage | LLMMessageGroup;
