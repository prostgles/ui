import { MonacoCodeInMarkdown } from "@components/Chat/MonacoCodeInMarkdown/MonacoCodeInMarkdown";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol, FlexRow } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import Loading from "@components/Loader/Loading";
import { SvgIcon } from "@components/SvgIcon";
import { Pagination, usePagination } from "@components/Table/Pagination";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { isObject, tryCatchV2 } from "prostgles-types";
import React, { useMemo } from "react";
import { SmartCard } from "src/dashboard/SmartCard/SmartCard";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";
import { useToolUseResultString } from "./common/useToolUseResultString";

export const DatabaseToolCall = ({
  toolUseContent,
  resultContent,
}: ProstglesMCPToolsProps) => {
  const { db, tables, methods, sql } = usePrgl();
  const resultString = useToolUseResultString(resultContent);
  const result = useMemo(() => {
    if (!resultContent) return;
    return "structuredContent" in resultContent ?
        resultContent.structuredContent
      : tryCatchV2(() => JSON.parse(resultString ?? "") as unknown).data;
  }, [resultContent, resultString]);
  const pagination = usePagination(25);
  const tableName =
    typeof toolUseContent.input?.tableName === "string" ?
      toolUseContent.input.tableName
    : "";
  const table = tables.find((table) => table.name === tableName);

  if (!resultContent) return <Loading />;
  if (resultContent.is_error) {
    return <ErrorComponent error={resultString || "Tool call failed"} />;
  }

  const returnedRows =
    Array.isArray(result) && result.every(isObject) ? result
    : isObject(result) ? [result]
    : undefined;

  if (!returnedRows) {
    return result === undefined && !resultString ?
        <InfoRow color="info">No result returned</InfoRow>
      : <DatabaseToolCallValue
          value={result === undefined ? resultString : result}
        />;
  }

  return (
    <FlexCol className="DatabaseToolCall gap-p5">
      <FlexRow className="gap-p5">
        {table?.icon && <SvgIcon icon={table.icon} size={24} />}
        <h4 className="m-0">
          {`${table?.label ?? tableName} (${returnedRows.length})`}
        </h4>
      </FlexRow>
      {!returnedRows.length && <InfoRow color="info">No records</InfoRow>}
      {returnedRows
        .slice(pagination.offset, pagination.offset + pagination.limit)
        .map((row, index) => (
          <SmartCard
            key={pagination.offset + index}
            db={db}
            tables={tables}
            methods={methods}
            sql={sql}
            tableName={tableName}
            columns={table?.columns ?? []}
            defaultData={row}
            fullData={{ rows: returnedRows, index: pagination.offset + index }}
            showViewEditBtn={false}
            fieldConfigs={Object.keys(row).map((name) => ({
              name,
              label:
                table?.columns.find((column) => column.name === name)?.label ??
                name,
              style: {
                width: "100%",
                maxHeight: "none",
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              },
              renderMode: "valueNode",
              render: (value: unknown) => (
                <DatabaseToolCallValue value={value} />
              ),
            }))}
          />
        ))}
      <Pagination {...pagination} totalRows={returnedRows.length} />
    </FlexCol>
  );
};

const DatabaseToolCallValue = ({ value }: { value: unknown }) => {
  const formattedValue = useMemo(
    () => (typeof value === "string" ? value : JSON.stringify(value, null, 2)),
    [value],
  );
  if (!formattedValue || formattedValue.length <= 2000) {
    return <span className="font-16 text-0 ws-pre-wrap">{formattedValue}</span>;
  }
  return (
    <MonacoCodeInMarkdown
      codeString={formattedValue}
      language={typeof value === "string" ? "text" : "json"}
      style={{ height: 300, minWidth: 0, width: "100%", flex: "none" }}
      codeHeader={undefined}
      sqlHandler={undefined}
      loadedSuggestions={undefined}
    />
  );
};
