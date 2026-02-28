import React, { useMemo } from "react";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import { Marked } from "@components/Chat/Marked";
import { useToolUseResultString } from "../common/useToolUseResultString";
import { FlexCol } from "@components/Flex";

export const WebSnapshot = ({
  toolUseResult: toolResult,
}: ProstglesMCPToolsProps) => {
  const doubleEscaped = useToolUseResultString(
    toolResult?.toolUseResultMessage,
  );
  const parsedString = useMemo(() => {
    if (!doubleEscaped) {
      return doubleEscaped;
    }
    try {
      return JSON.parse(doubleEscaped) as string;
    } catch (error) {
      console.error("Error parsing double-escaped string:", error);
      return doubleEscaped;
    }
  }, [doubleEscaped]);

  return (
    <FlexCol className="b b-color p-1">
      <Marked
        codeHeader={undefined}
        content={parsedString ?? ""}
        loadedSuggestions={undefined}
        prgl={undefined}
        sqlHandler={undefined}
      />
    </FlexCol>
  );
};
