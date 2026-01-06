import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { MonacoCodeInMarkdown } from "@components/Chat/MonacoCodeInMarkdown/MonacoCodeInMarkdown";
import { FlexCol } from "@components/Flex";
import { type JSONB } from "prostgles-types";
import React from "react";
import { LANG } from "src/dashboard/SQLEditor/W_SQLEditor";
import { usePrgl } from "src/pages/ProjectConnection/PrglContextProvider";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";

export type InputSchema = JSONB.GetObjectType<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-db"]["execute_sql_with_commit"]["schema"]["type"]
>;

export const ExecuteSQL = ({ message }: ProstglesMCPToolsProps) => {
  const initialData = message.input as InputSchema;
  const { db } = usePrgl();
  const codeString = initialData.sql;
  return (
    <FlexCol className="ExecuteSQL ai-start gap-0 f-1">
      <MonacoCodeInMarkdown
        key={codeString}
        codeHeader={undefined}
        language={LANG}
        codeString={codeString}
        sqlHandler={db.sql}
        loadedSuggestions={undefined}
      />
    </FlexCol>
  );
};
