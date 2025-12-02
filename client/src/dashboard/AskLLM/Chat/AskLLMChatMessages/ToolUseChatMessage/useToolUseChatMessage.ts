import { getMCPToolNameParts } from "@common/prostglesMcp";
import { useMemo } from "react";
import type { MonacoCodeInMarkdownProps } from "@components/Chat/MonacoCodeInMarkdown/MonacoCodeInMarkdown";
import type { UseLLMChatProps } from "../../useLLMChat";
import type { DBSSchema } from "@common/publishUtils";
import { getToolUseResult } from "./utils/getToolUseResult";
import type { ToolUseMessage } from "./ToolUseChatMessage";

export type ToolUseMessageProps = Pick<UseLLMChatProps, "mcpServerIcons"> & {
  message: DBSSchema["llm_messages"];
  nextMessage: DBSSchema["llm_messages"] | undefined;
  toolUseMessageContentIndex: number;
  workspaceId: string | undefined;
} & Pick<MonacoCodeInMarkdownProps, "sqlHandler" | "loadedSuggestions">;

export const useToolUseChatMessage = (props: ToolUseMessageProps) => {
  const { message, nextMessage, toolUseMessageContentIndex, mcpServerIcons } =
    props;

  const toolUseMessage = message;
  const toolUseMessageContent =
    toolUseMessage.message[toolUseMessageContentIndex];

  const iconName = useMemo(() => {
    return toolUseMessageContent?.type === "tool_use" ?
        getIconForToolUseMessage(toolUseMessageContent, mcpServerIcons)
      : undefined;
  }, [mcpServerIcons, toolUseMessageContent]);

  if (toolUseMessageContent?.type !== "tool_use") {
    return "Unexpected message tool use message";
  }

  const toolUseResult =
    nextMessage &&
    getToolUseResult({
      nextMessage,
      toolUseMessage,
      toolUseMessageContentIndex: toolUseMessageContentIndex,
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

export const getIconForToolUseMessage = (
  { name }: ToolUseMessage,
  mcpServerIcons: Map<string, string>,
) => {
  const serverName = getMCPToolNameParts(name)?.serverName;
  return serverName && mcpServerIcons.get(serverName);
};
