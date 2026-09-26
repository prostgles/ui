import { FlexRowWrap } from "@components/Flex";
import type { AnyObject } from "prostgles-types";
import React from "react";
import type { DBSchemaTableWithRenderInfo } from "src/dashboard/Dashboard/getTables";
import { getColumnsWithInfo } from "../../tableUtils/getColumnsWithInfo";
import type { ChartValues } from "../../tableUtils/fetchChartRangeValues";
import { RenderColumn } from "../../RenderColumn/RenderColumn";
import type { ColumnConfigWithInfo } from "../../W_Table";
import type { ColumnConfig } from "../ColumnConfig";
import { getLinkedRecordsFilter } from "./getLinkedRecordsFilter";
import { NestedColumnRenderEntities } from "./NestedColumnRenderEntities";
import { NestedColumnRenderTimechart } from "./NestedColumnRenderTimechart";

export type NestedTimeChartMeta = {
  fullExtent: [Date, Date];
};
export type NestedColumnRenderProps = {
  column: Omit<ColumnConfig, "format">;
  row: AnyObject;
  nestedTimeChartMeta: NestedTimeChartMeta | undefined;
  barchartVals?: ChartValues;
  tables: DBSchemaTableWithRenderInfo[];
  getValues: () => unknown[];
  rootTableName: string;
};

export const NestedColumnRender = ({
  column,
  row: parentRow,
  nestedTimeChartMeta,
  barchartVals,
  tables,
  getValues,
  rootTableName,
}: NestedColumnRenderProps): JSX.Element => {
  const { nested } = column;
  const table = tables.find((t) => t.name === nested?.path.at(-1)?.table);
  if (!nested || !table) return <>Unexpected issue: No nested columns</>;
  const display = nested.display ?? { type: "values" };
  if (display.type === "timechart") {
    return (
      <NestedColumnRenderTimechart
        chart={display}
        columnName={column.name}
        row={parentRow}
        nestedTimeChartMeta={nestedTimeChartMeta}
      />
    );
  }

  const rows = (parentRow[column.name] ?? []) as Record<string, unknown>[];
  const shownColumns = getColumnsWithInfo(
    table.name,
    tables,
    nested.columns,
  ).filter((c) => c.show);
  if (display.type === "entities") {
    return (
      <NestedColumnRenderEntities
        column={column}
        table={table}
        tables={tables}
        rows={rows}
        parentRow={parentRow}
        rootTableName={rootTableName}
        shownColumns={shownColumns}
      />
    );
  }

  const labels =
    !display.labels || display.labels === "auto" ?
      shownColumns.length === 1 ?
        "none"
      : "above"
    : display.labels;
  const render = (
    child: ColumnConfigWithInfo,
    row: Record<string, unknown>,
  ) => {
    const linkedRecordsFilter =
      child.action?.type === "relatedRecords" ?
        getLinkedRecordsFilter({
          column,
          nestedColumn: child,
          nestedRow: row,
          parentRow,
          rootTableName,
        })
      : undefined;
    return (
      <RenderColumn
        column={child}
        table={table}
        tables={tables}
        row={row}
        barchartVals={barchartVals}
        isNested
        getValues={() =>
          getValues().flatMap(
            (rows) =>
              (rows as Record<string, unknown>[] | undefined)?.map(
                (r) => r[child.name],
              ) ?? [],
          )
        }
        relatedRecords={
          linkedRecordsFilter && {
            ...linkedRecordsFilter,
            rootTableName,
            popupTitle: `${child.label || child.info?.label || child.name}: ${table.label}`,
          }
        }
      />
    );
  };
  const firstColumn = shownColumns[0];
  if (labels === "none" && shownColumns.length === 1 && !table.isFileTable) {
    return (
      <>
        {rows.map((row, index) => (
          <React.Fragment key={index}>
            {render(firstColumn!, row)}
          </React.Fragment>
        ))}
      </>
    );
  }
  const content = rows.map((row, index) => (
    <div key={index} className="flex-row-wrap gap-p5 ws-pre">
      {shownColumns.map((child) => (
        <div
          key={child.name}
          className={
            labels === "inline" ? "flex-row gap-p25" : "flex-col gap-0"
          }
        >
          {labels !== "none" && (
            <span className="text-2 font-12">
              {child.label || child.info?.label || child.name}
            </span>
          )}
          {render(child, row)}
        </div>
      ))}
    </div>
  ));
  return table.isFileTable ?
      <FlexRowWrap className="max-h-full">{content}</FlexRowWrap>
    : <>{content}</>;
};
