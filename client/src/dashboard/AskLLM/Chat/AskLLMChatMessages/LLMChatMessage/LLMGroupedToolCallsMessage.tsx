import Btn from "@components/Btn";
import { SvgIcon } from "@components/SvgIcon";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useMemo } from "react";
import { useLLMSetupDone } from "src/dashboard/AskLLM/Setup/LLMSetupProvider";
import { isDefined } from "src/utils/utils";
import {
  getMessageContentItems,
  type LLMMessageGroup,
} from "../hooks/useLLMChatMessageGrouper";
import { getIconForToolUseMessage } from "../ToolUseChatMessage/useToolUseChatMessage";
import type { LLMChatMessageCommonProps } from "./LLMChatMessage";
import { LLMChatMessageContentText } from "./LLMChatMessageContentText";

export const LLMGroupedToolCallsMessage = ({
  loadedSuggestions,
  onToggle,
  messages,
}: {
  messages: LLMMessageGroup["messages"];
  onToggle: VoidFunction;
} & Pick<LLMChatMessageCommonProps, "loadedSuggestions">) => {
  const messageContentItems = useMemo(() => {
    return getMessageContentItems({ messages });
  }, [messages]);

  const { sql } = usePrgl();
  const { mcpServerIcons } = useLLMSetupDone();
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

  const allMessagesAreErrored = useMemo(() => {
    let totalToolResultMessages = 0;
    let erroredToolResultMessages = 0;
    messages.forEach(({ nextMessage }) => {
      nextMessage?.message.forEach((m) => {
        if (m.type === "tool_result") {
          totalToolResultMessages++;
          if (m.is_error) {
            erroredToolResultMessages++;
          }
        }
      });
    });
    return (
      totalToolResultMessages > 0 &&
      totalToolResultMessages === erroredToolResultMessages
    );
  }, [messages]);

  const textMessages = useMemo(() => {
    const textMessages = messageContentItems
      .map((m) => {
        if (m.type === "text" && "text" in m && m.text) {
          return m;
        }
      })
      .filter(isDefined);
    return textMessages;
  }, [messageContentItems]);
  const firstTextMessage = textMessages[0];
  const lastTextMessage = textMessages.at(-1);

  return (
    <>
      {firstTextMessage && (
        <LLMChatMessageContentText
          messageContent={firstTextMessage}
          sqlHandler={sql}
          loadedSuggestions={loadedSuggestions}
        />
      )}
      <Btn
        variant="faded"
        size="small"
        color={allMessagesAreErrored ? "danger" : undefined}
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
          sqlHandler={sql}
          loadedSuggestions={loadedSuggestions}
        />
      )}
    </>
  );
};
