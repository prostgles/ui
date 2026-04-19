import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { MonacoCodeInMarkdown } from "@components/Chat/MonacoCodeInMarkdown/MonacoCodeInMarkdown";
import { FlexCol } from "@components/Flex";
import { type JSONB } from "prostgles-types";
import React from "react";
import { LANG } from "src/dashboard/SQLEditor/W_SQLEditor";
import { usePrgl } from "src/pages/ProjectConnection/PrglContextProvider";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";

export type InputSchema = JSONB.GetObjectType<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["db"]["execute_sql"]["schema"]["type"]
>;

export const ExecuteSQL = ({
  toolUseContent,
  resultContent,
}: ProstglesMCPToolsProps) => {
  const initialData = toolUseContent.input as InputSchema;
  const { sql } = usePrgl();
  const codeString = initialData.sql;
  return (
    <FlexCol className="ExecuteSQL ai-start gap-0 f-1">
      <MonacoCodeInMarkdown
        key={codeString}
        codeHeader={undefined}
        language={LANG}
        codeString={codeString}
        sqlHandler={sql}
        loadedSuggestions={undefined}
        resultContent={resultContent}
      />
    </FlexCol>
  );
};
