import { getMCPToolNameParts } from "@common/prostglesMcp";
import { getToolUseResult } from "./ToolUseChatMessageJSONData";
import { useMemo } from "react";
import type { MarkdownMonacoCodeProps } from "@components/Chat/MarkdownMonacoCode";
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
  const m = fullMessage?.message[toolUseMessageIndex];

  const iconName = useMemo(() => {
    const serverName =
      m?.type !== "tool_use" ? "" : getMCPToolNameParts(m.name)?.serverName;
    return serverName && mcpServerIcons.get(serverName);
  }, [mcpServerIcons, m]);

  if (!fullMessage || m?.type !== "tool_use") {
    return "Unexpected message tool use message";
  }

  const toolUseResult = getToolUseResult(
    messages.slice(toolUseMessageIndex),
    m,
  );

  return {
    toolUseResult,
    iconName,
    fullMessage,
    m,
  };
};
