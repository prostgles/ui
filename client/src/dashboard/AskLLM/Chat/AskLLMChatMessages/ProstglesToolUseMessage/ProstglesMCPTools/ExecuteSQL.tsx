import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { FlexCol } from "@components/Flex";
import {
  MONACO_READONLY_DEFAULT_OPTIONS,
  MonacoEditor,
} from "@components/MonacoEditor/MonacoEditor";
import { type JSONB } from "prostgles-types";
import React from "react";
import { SQLSmartEditor } from "src/dashboard/SQLEditor/SQLSmartEditor";
import { LANG } from "src/dashboard/SQLEditor/W_SQLEditor";
import { usePrgl } from "src/pages/ProjectConnection/PrglContextProvider";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";
import { MarkdownMonacoCode } from "@components/Chat/MarkdownMonacoCode";

export type InputSchema = JSONB.GetObjectType<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-db"]["execute_sql_with_commit"]["schema"]["type"]
>;

const monacoOptions = {
  ...MONACO_READONLY_DEFAULT_OPTIONS,
  readOnly: false,
  lineNumbers: "on",
} as const;

export const ExecuteSQL = ({
  message,
  toolUseResult: toolResult,
  chatId,
}: ProstglesMCPToolsProps) => {
  const initialData = message.input as InputSchema;
  const { db } = usePrgl();
  const codeString = initialData.sql;
  return (
    <FlexCol className="ExecuteSQL ai-start gap-0 f-1">
      <MarkdownMonacoCode
        className="my-1"
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
