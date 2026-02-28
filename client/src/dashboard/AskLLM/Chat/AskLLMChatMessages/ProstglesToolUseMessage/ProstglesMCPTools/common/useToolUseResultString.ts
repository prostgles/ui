import { findArr } from "@common/llmUtils";
import { type JSONB } from "prostgles-types";
import { useMemo } from "react";
import type { ToolResultMessage } from "../../../ToolUseChatMessage/ToolUseChatMessage";

export const useToolUseResultString = <S extends JSONB.FieldType>(
  toolUseResult: ToolResultMessage | undefined,
): string | undefined => {
  const str = useMemo(() => {
    try {
      if (toolUseResult) {
        const { content } = toolUseResult;
        const stringContent =
          typeof content === "string" ? content : (
            findArr(content, { type: "text" } as const)?.text
          );
        return stringContent;
      }
    } catch (error) {
      console.error("Error parsing tool use result content:", error);
    }
    return undefined;
  }, [toolUseResult]);

  return str;
};
