import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { MonacoCodeInMarkdown } from "@components/Chat/MonacoCodeInMarkdown/MonacoCodeInMarkdown";
import { FlexCol } from "@components/Flex";
import { type JSONB } from "prostgles-types";
import React from "react";
import { LANG } from "src/dashboard/SQLEditor/W_SQLEditor";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";

export type InputSchema = JSONB.GetObjectType<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["create_tables"]["schema"]["type"]
>;

export const CreateTables = ({
  toolUseContent,
  resultContent,
}: ProstglesMCPToolsProps) => {
  const initialData = toolUseContent.input as InputSchema;
  const codeString = initialData.ddlStatements;
  return (
    <FlexCol className="CreateTables ai-start gap-0 f-1">
      <MonacoCodeInMarkdown
        key={codeString}
        codeHeader={undefined}
        language={LANG}
        codeString={codeString}
        sqlHandler={undefined}
        loadedSuggestions={undefined}
        resultContent={resultContent}
      />
    </FlexCol>
  );
};
