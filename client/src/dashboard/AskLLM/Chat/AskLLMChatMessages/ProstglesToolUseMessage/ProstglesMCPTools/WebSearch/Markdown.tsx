import { Marked } from "@components/Chat/Marked";
import { FlexCol } from "@components/Flex";
import React from "react";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import { useToolUseResultString } from "../common/useToolUseResultString";

export const Markdown = ({ resultContent }: ProstglesMCPToolsProps) => {
  const str = useToolUseResultString(resultContent);

  return (
    <FlexCol className="b b-color p-1">
      <Marked
        codeHeader={undefined}
        content={str ?? ""}
        loadedSuggestions={undefined}
        prgl={undefined}
        sqlHandler={undefined}
      />
    </FlexCol>
  );
};
