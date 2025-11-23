import { getMCPToolNameParts } from "@common/prostglesMcp";
import { useMemo } from "react";
import type { MarkdownMonacoCodeProps } from "@components/Chat/MarkdownMonacoCode/MarkdownMonacoCode";
import type { UseLLMChatProps } from "../../useLLMChat";
import type { DBSSchema } from "@common/publishUtils";
import { getToolUseResult } from "./utils/getToolUseResult";

export type ToolUseMessageProps = Pick<UseLLMChatProps, "mcpServerIcons"> & {
  messages: DBSSchema["llm_messages"][];
  messageIndex: number;
  toolUseMessageContentIndex: number;
  workspaceId: string | undefined;
} & Pick<MarkdownMonacoCodeProps, "sqlHandler" | "loadedSuggestions">;

export const useToolUseChatMessage = (props: ToolUseMessageProps) => {
  const {
    messages,
    toolUseMessageContentIndex: toolUseMessageIndex,
    messageIndex,
    mcpServerIcons,
  } = props;

  const toolUseMessage = messages[messageIndex];
  const nextMessage = messages[messageIndex + 1];
  const toolUseMessageContent = toolUseMessage?.message[toolUseMessageIndex];

  const iconName = useMemo(() => {
    const serverName =
      toolUseMessageContent?.type !== "tool_use" ?
        ""
      : getMCPToolNameParts(toolUseMessageContent.name)?.serverName;
    return serverName && mcpServerIcons.get(serverName);
  }, [mcpServerIcons, toolUseMessageContent]);

  if (!toolUseMessage || toolUseMessageContent?.type !== "tool_use") {
    return "Unexpected message tool use message";
  }

  const toolUseResult =
    nextMessage &&
    getToolUseResult({
      messages,
      toolUseMessageIndex: messageIndex,
      toolUseMessageContentIndex: toolUseMessageIndex,
    });

  return {
    toolUseResult,
    iconName,
    toolUseMessage,
    toolUseMessageContent,
  };
};

export type ToolUseChatMessageState = Exclude<
  ReturnType<typeof useToolUseChatMessage>,
  string
>;
