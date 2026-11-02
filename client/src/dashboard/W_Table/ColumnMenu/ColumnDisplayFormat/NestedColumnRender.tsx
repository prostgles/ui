import { FlexRowWrap } from "@components/Flex";
import type { AnyObject } from "prostgles-types";
import React from "react";
import type { DBSchemaTableWithRenderInfo } from "src/dashboard/Dashboard/getTables";
import { getColumnsWithInfo } from "../../tableUtils/getColumnsWithInfo";
import type { ChartValues } from "../../tableUtils/fetchChartRangeValues";
import { RenderColumn } from "../../RenderColumn/RenderColumn";
import type { ColumnConfigWithInfo } from "@common/ColumnConfig/ColumnConfig";
import type { ColumnConfigNested } from "@common/ColumnConfig/ColumnConfig";
import { getLinkedRecordsFilter } from "./getLinkedRecordsFilter";
import { NestedColumnRenderRecords } from "./NestedColumnRenderRecords";
import { NestedColumnRenderTimechart } from "./NestedColumnRenderTimechart";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { excludeFkeyActions } from "../../tableUtils/excludeFkeyActions";
import { RenderValue } from "../../../SmartForm/SmartFormField/RenderValue";
import { RenderColumnButton } from "../../RenderColumn/RenderColumnButton";
import { getColumnDrillDownDisabledInfo } from "./getColumnDrillDownDisabledInfo";

export type NestedTimeChartMeta = {
  fullExtent: [Date, Date];
};
export type NestedColumnRenderProps = {
  column: ColumnConfigNested;
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
  const { methods } = usePrgl();
  const { nested } = column;
  const table = tables.find((t) => t.name === nested.path.at(-1)?.table);
  if (!table) return <>Unexpected issue: No nested table</>;
  const rows = (parentRow[column.name] ?? []) as Record<string, unknown>[];
  const display = nested.display ?? { type: "values" };
  const shownColumns = excludeFkeyActions(
    getColumnsWithInfo(table.name, tables, nested.columns),
    table,
    methods,
  ).filter((c) => c.show);
  const fallbackColumn =
    nested.fallbackColumn &&
    tables
      .find((table) => table.name === rootTableName)
      ?.columns.find(
        (column) => column.name === nested.fallbackColumn && column.select,
      );
  const hasEmptyValues =
    nested.fallbackOnEmpty &&
    display.type === "values" &&
    shownColumns.length > 0 &&
    rows.every((row) =>
      shownColumns.every(
        ({ name, format }) =>
          format?.type !== "Action" &&
          format?.type !== "ActionColumns" &&
          (row[name] == null || row[name] === ""),
      ),
    );
  if (fallbackColumn && (!rows.length || hasEmptyValues)) {
    return (
      <RenderValue
        column={fallbackColumn}
        value={parentRow[fallbackColumn.name]}
      />
    );
  }
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

  if (display.type === "drillable-records") {
    return (
      <NestedColumnRenderRecords
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
  const groupDrillDown =
    column.display === "drillable-records" &&
    shownColumns.length > 1 &&
    shownColumns.every(
      (child) =>
        child.display === "drillable-records" &&
        !child.computedConfig?.funcDef.isAggregate &&
        !getColumnDrillDownDisabledInfo(child, "values"),
    );
  const getRelatedRecords = (
    row: Record<string, unknown>,
    child: ColumnConfigWithInfo | undefined,
  ) => {
    const filter = getLinkedRecordsFilter({
      column,
      nestedColumn: child,
      nestedRow: row,
      parentRow,
      rootTableName,
      rootTable: tables.find((table) => table.name === rootTableName),
      table,
    });
    return (
      filter && {
        ...filter,
        rootTableName,
        popupTitle:
          child ?
            `${child.label || child.info?.label || child.name}: ${table.label}`
          : column.label || column.name,
      }
    );
  };
  const render = (
    child: ColumnConfigWithInfo,
    row: Record<string, unknown>,
  ) => {
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
          !groupDrillDown && child.display === "drillable-records" ?
            getRelatedRecords(row, child)
          : undefined
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
  const content = rows.map((row, index) => {
    const values = (
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
    );
    if (!groupDrillDown) return values;
    return (
      <RenderColumnButton
        key={index}
        column={{ ...column, udt_name: "jsonb", tsDataType: "any[]" }}
        row={row}
        table={table}
        tables={tables}
        barchartVals={barchartVals}
        relatedRecords={getRelatedRecords(row, undefined)}
      >
        {values}
      </RenderColumnButton>
    );
  });
  return table.isFileTable ?
      <FlexRowWrap className="max-h-full">{content}</FlexRowWrap>
    : <>{content}</>;
};
