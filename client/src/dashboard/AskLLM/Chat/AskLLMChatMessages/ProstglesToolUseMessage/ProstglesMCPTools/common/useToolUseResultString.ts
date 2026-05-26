import { findArr } from "@common/llmUtils";
import { useMemo } from "react";
import type { ToolResultMessage } from "../../../ToolUseChatMessage/ToolUseChatMessage";

export const useToolUseResultString = (
  toolUseResult: ToolResultMessage | undefined,
): string | undefined => {
  const str = useMemo(() => {
    if (!toolUseResult) {
      return;
    }
    return getToolUseResultString(toolUseResult);
  }, [toolUseResult]);

  return str;
};

export const getToolUseResultString = (
  toolUseResult: ToolResultMessage,
): string | undefined => {
  const { content } = toolUseResult;
  const stringContent =
    typeof content === "string" ? content : (
      findArr(content, { type: "text" } as const)?.text
    );
  return stringContent;
};
