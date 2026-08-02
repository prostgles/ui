import Btn from "@components/Btn";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { useMcpServerIcons } from "@pages/ServerSettings/MCPServers/MCPServerTools/useMcpServerIcons";
import React, { useMemo } from "react";
import { isDefined } from "src/utils/utils";
import {
  getMessageContentItems,
  type LLMMessageGroup,
} from "../hooks/useLLMChatMessageGrouper";
import type { LLMChatMessageCommonProps } from "./LLMChatMessage";
import { LLMChatMessageContentText } from "./LLMChatMessageContentText";
import { LLMToolCallIcon } from "./LLMToolCallIcon";

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
  const { getIconFromFullName } = useMcpServerIcons();
  const { icons, toolCallCount } = useMemo(() => {
    let toolCallCount = 0;
    const iconPaths = messageContentItems
      .map((m) => {
        if (m.type === "tool_use") {
          toolCallCount++;
          return getIconFromFullName(m.name);
        }
      })
      .filter(isDefined);
    const icons = Array.from(new Set(iconPaths)).slice(0, 5);
    return {
      icons,
      toolCallCount,
    };
  }, [messageContentItems, getIconFromFullName]);

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

  const someToolUseMessagesNeedResult = useMemo(() => {
    return messages.some(({ message, nextMessage }) => {
      return message.message.some(
        (m) =>
          m.type === "tool_use" &&
          !nextMessage?.message.some(
            (m) => m.type === "tool_result" && m.tool_use_id === m.tool_use_id,
          ),
      );
    });
  }, [messages]);

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
        loading={someToolUseMessagesNeedResult ? "allow-clicking" : undefined}
      >
        {icons.map((iconName) => {
          return <LLMToolCallIcon key={iconName} iconName={iconName} />;
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
