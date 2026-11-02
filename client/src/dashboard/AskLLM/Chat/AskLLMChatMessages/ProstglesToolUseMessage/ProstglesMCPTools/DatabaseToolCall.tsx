import { getMCPToolNameParts } from "@common/mcpUtils";
import ErrorComponent from "@components/ErrorComponent";
import { FlexRow } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import Loading from "@components/Loader/Loading";
import { SvgIcon } from "@components/SvgIcon";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { usePromise } from "prostgles-client";
import { tryCatchV2 } from "prostgles-types";
import React from "react";
import { SmartCardList } from "src/dashboard/SmartCardList/SmartCardList";
import { getTableCardFieldConfigs } from "src/dashboard/SmartForm/SmartFormField/getTableCardFieldConfigs";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";
import { getToolCallRowFilter } from "./AgenticWorkflow/AgenticWorkflowActivity/getToolCallRowFilter";
import { useToolUseResultString } from "./common/useToolUseResultString";

export const DatabaseToolCall = ({
  toolUseContent,
  resultContent,
}: ProstglesMCPToolsProps) => {
  const { db, tables, methods, sql } = usePrgl();
  const resultString = useToolUseResultString(resultContent);
  const table = tables.find(
    (table) => table.name === toolUseContent.input?.tableName,
  );
  const cardFieldConfigs = usePromise(async () => {
    if (!table || !db[table.name]?.find) return;
    return tryCatchV2(() =>
      getTableCardFieldConfigs({ table, tables, db, methods }),
    );
  }, [table, tables, db, methods]);

  if (!resultContent) return <Loading />;
  if (resultContent.is_error) {
    return <ErrorComponent error={resultString || "Tool call failed"} />;
  }

  if (!table || !db[table.name]?.find) {
    return <InfoRow color="info">Table is not available</InfoRow>;
  }
  if (cardFieldConfigs?.hasError) {
    return <ErrorComponent error={cardFieldConfigs.error} />;
  }
  if (!cardFieldConfigs?.data) return <Loading />;

  const returnedRows =
    "structuredContent" in resultContent ?
      resultContent.structuredContent
    : tryCatchV2(() => JSON.parse(resultString ?? "") as unknown).data;
  const searchFilter = getToolCallRowFilter(
    {
      mcp_tool_name: getMCPToolNameParts(toolUseContent.name)?.toolName ?? null,
      input: toolUseContent.input ?? null,
      output: { structuredContent: returnedRows },
    },
    table,
  );

  return (
    <SmartCardList
      db={db}
      tables={tables}
      methods={methods}
      sql={sql}
      tableName={table.name}
      title={({ count }) => (
        <FlexRow className="gap-p5">
          {table.icon && <SvgIcon icon={table.icon} size={24} />}
          <h4 className="m-0">{`${table.label} (${count})`}</h4>
        </FlexRow>
      )}
      fieldConfigs={cardFieldConfigs.data}
      orderBy={table.sort}
      searchFilter={searchFilter?.map((filter) => ({
        ...filter,
        minimised: true,
      }))}
      showTopBar={{ sort: true }}
      noDataComponent={<InfoRow color="info">No records</InfoRow>}
    />
  );
};
