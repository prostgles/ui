import Btn from "@components/Btn";
import { SvgIcon } from "@components/SvgIcon";
import React, { useMemo } from "react";
import { isDefined } from "src/utils/utils";
import type { LLMMessageContent } from "../ToolUseChatMessage/ToolUseChatMessage";
import { getIconForToolUseMessage } from "../ToolUseChatMessage/useToolUseChatMessage";
import type { LLMChatMessageCommonProps } from "./LLMChatMessage";
import { LLMChatMessageContentText } from "./LLMChatMessageContentText";

export const LLMGroupedToolCallsMessage = ({
  messageContentItems,
  mcpServerIcons,
  db,
  loadedSuggestions,
  onToggle,
}: { messageContentItems: LLMMessageContent[]; onToggle: VoidFunction } & Pick<
  LLMChatMessageCommonProps,
  "mcpServerIcons" | "db" | "loadedSuggestions"
>) => {
  const { icons, toolCallCount } = useMemo(() => {
    let toolCallCount = 0;
    const iconPaths = messageContentItems
      .map((m) => {
        if (m.type === "tool_use") {
          toolCallCount++;
          return getIconForToolUseMessage(m, mcpServerIcons);
        }
      })
      .filter(isDefined);
    const icons = Array.from(new Set(iconPaths)).slice(0, 5);
    return {
      icons,
      toolCallCount,
    };
  }, [messageContentItems, mcpServerIcons]);

  const textMessages = useMemo(() => {
    return messageContentItems
      .map((m) => {
        if (m.type === "text" && "text" in m && m.text) {
          return m;
        }
      })
      .filter(isDefined);
  }, [messageContentItems]);
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
        onClick={onToggle}
        data-command="ToolUseMessage.toggleGroup"
      >
        {icons.map((iconPath) => {
          return <SvgIcon key={iconPath} icon={iconPath} />;
        })}
        {toolCallCount} tool calls
      </Btn>
      {textMessages.length > 1 && lastTextMessage && (
        <LLMChatMessageContentText
          messageContent={lastTextMessage}
          db={db}
          loadedSuggestions={loadedSuggestions}
        />
      )}
    </>
  );
};
