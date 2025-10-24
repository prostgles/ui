import { getMCPToolNameParts } from "@common/prostglesMcp";
import { getToolUseResult } from "./ToolUseChatMessageJSONData";
import { useMemo } from "react";
import type { MarkdownMonacoCodeProps } from "@components/Chat/MarkdownMonacoCode/MarkdownMonacoCode";
import type { UseLLMChatProps } from "../../useLLMChat";
import type { DBSSchema } from "@common/publishUtils";

export type ToolUseMessageProps = Pick<UseLLMChatProps, "mcpServerIcons"> & {
  messages: DBSSchema["llm_messages"][];
  messageIndex: number;
  toolUseMessageIndex: number;
  workspaceId: string | undefined;
} & Pick<MarkdownMonacoCodeProps, "sqlHandler" | "loadedSuggestions">;

export const useToolUseChatMessage = (props: ToolUseMessageProps) => {
  const { messages, toolUseMessageIndex, messageIndex, mcpServerIcons } = props;

  const fullMessage = messages[messageIndex];
  const toolUseMessage = fullMessage?.message[toolUseMessageIndex];

  const iconName = useMemo(() => {
    const serverName =
      toolUseMessage?.type !== "tool_use" ?
        ""
      : getMCPToolNameParts(toolUseMessage.name)?.serverName;
    return serverName && mcpServerIcons.get(serverName);
  }, [mcpServerIcons, toolUseMessage]);

  if (!fullMessage || toolUseMessage?.type !== "tool_use") {
    return "Unexpected message tool use message";
  }

  const toolUseResult = getToolUseResult(
    messages.slice(toolUseMessageIndex),
    toolUseMessage,
  );

  return {
    toolUseResult,
    iconName,
    fullMessage,
    m: toolUseMessage,
  };
};

export type ToolUseChatMessageState = Exclude<
  ReturnType<typeof useToolUseChatMessage>,
  string
>;
