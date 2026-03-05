import { getMCPToolNameParts } from "@common/prostglesMcp";
import type { DBSSchema } from "@common/publishUtils";
import type { MonacoCodeInMarkdownProps } from "@components/Chat/MonacoCodeInMarkdown/MonacoCodeInMarkdown";
import { useMcpServerIcons } from "@pages/ServerSettings/MCPServers/MCPServerTools/useMcpServerIcons";
import { useMemo } from "react";
import type { ToolUseMessage } from "./ToolUseChatMessage";
import { getToolUseResult } from "./utils/getToolUseResult";

export type ToolUseMessageProps = {
  message: DBSSchema["llm_messages"];
  nextMessage: DBSSchema["llm_messages"] | undefined;
  toolUseMessageContentIndex: number;
  workspaceId: string | undefined;
} & Pick<MonacoCodeInMarkdownProps, "sqlHandler" | "loadedSuggestions">;

export const useToolUseChatMessage = (props: ToolUseMessageProps) => {
  const { mcpServerIcons } = useMcpServerIcons();
  const { message, nextMessage, toolUseMessageContentIndex } = props;

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
