import { filterArr } from "@common/llmUtils";
import ErrorComponent from "@components/ErrorComponent";
import React, { useMemo } from "react";
import type { ToolResultMessage } from "../../ToolUseChatMessage/ToolUseChatMessage";

export const ToolUseResultError = ({
  toolUseResult,
  className,
}: {
  className?: string;
  toolUseResult: ToolResultMessage | undefined;
}) => {
  const content = toolUseResult;
  const error = useMemo(() => {
    if (!content?.is_error) return;
    if (typeof content.content === "string") {
      return content.content;
    }
    const textContent = filterArr(content.content, { type: "text" } as const);
    if (textContent.length === 1 && content.content.length === 1) {
      return textContent[0]!.text;
    }
    return content.content;
  }, [content]);

  if (!error) return null;

  return <ErrorComponent className={className} error={error} />;
};
