import React, { useMemo } from "react";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";
import ErrorComponent from "@components/ErrorComponent";
import { filterArr } from "@common/llmUtils";

export const ToolUseResultError = ({
  toolUseResult,
  className,
}: Pick<ProstglesMCPToolsProps, "toolUseResult"> & {
  className?: string;
}) => {
  const content = toolUseResult?.toolUseResultMessage;
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
