import type { DBSchemaTable } from "prostgles-types";
import React, { useMemo } from "react";
import type { DBSchemaTableWithOptions } from "src/dashboard/Dashboard/getTables";
import type { DBSchemaTablesWJoins } from "../../Dashboard/dashboardUtils";
import { RenderValue } from "../../SmartForm/SmartFormField/RenderValue";
import type { NestedTimeChartMeta } from "../ColumnMenu/ColumnDisplayFormat/NestedColumnRender";
import { NestedColumnRender } from "../ColumnMenu/ColumnDisplayFormat/NestedColumnRender";
import { DISPLAY_FORMATS } from "../ColumnMenu/ColumnDisplayFormat/columnFormatUtils";
import { getColumnFormat } from "../ColumnMenu/ColumnDisplayFormat/getFormatColumnSelect";
import { getColumnDrillDownDisabledInfo } from "../ColumnMenu/ColumnDisplayFormat/getColumnDrillDownDisabledInfo";
import type { NestedColumn } from "../ColumnMenu/ColumnConfig";
import type { ColumnConfigWithInfo, MinMaxVals } from "../W_Table";
import {
  RenderColumnButton,
  type RelatedRecordsContext,
} from "./RenderColumnButton";
import { StyledTableColumn } from "./StyledTableColumn";

export type RenderedColumn =
  ColumnConfigWithInfo | NestedColumn<ColumnConfigWithInfo>;

export type RenderColumnProps = {
  column: RenderedColumn;
  getValues: () => unknown[];
  table: DBSchemaTable;
  maxCellChars?: number;
  isNested?: boolean;
  relatedRecords?: RelatedRecordsContext;
  tables: DBSchemaTablesWJoins;
  barchartVals: MinMaxVals | undefined;
};

export const RenderColumn = (
  args: RenderColumnProps & {
    row: Record<string, unknown>;
  },
) => {
  const { row, column, table, tables, barchartVals, getValues, maxCellChars } =
    args;
  const value = row[column.name];
  const showDrillDown =
    !!args.relatedRecords &&
    !getColumnDrillDownDisabledInfo(column, args.isNested ? "values" : undefined);
  if (column.nested) {
    const chartLimits = barchartVals?.get(column.name);
    const nestedTimeChartMeta: NestedTimeChartMeta | undefined =
      chartLimits?.type === "date" ?
        {
          fullExtent: [
            new Date(chartLimits.range.min),
            new Date(chartLimits.range.max),
          ],
        }
      : undefined;
    return (
      <NestedColumnRender
        row={row}
        column={{ ...column, nested: column.nested }}
        tables={tables}
        rootTableName={table.name}
        nestedTimeChartMeta={nestedTimeChartMeta}
        barchartVals={
          chartLimits?.type === "nested" ? chartLimits.children : undefined
        }
        getValues={getValues}
      />
    );
  }

  const formattedValue = (
    <RenderColumnValue
      column={column}
      row={row}
      showTitle={true}
      maxCellChars={maxCellChars}
      getValues={getValues}
      table={table as DBSchemaTableWithOptions}
    />
  );
  // Colour and chip styles belong to the action button itself.
  const styleOnButton =
    showDrillDown &&
    (!column.style?.type ||
      ["None", "Fixed", "Conditional", "Scale"].includes(column.style.type));
  const content =
    !column.style?.type || column.style.type === "None" || styleOnButton ?
      formattedValue
    : <StyledTableColumn
        renderedVal={formattedValue}
        formattedValue={formattedValue}
        value={value}
        row={row}
        table={table}
        tables={tables}
        column={column}
        barchartVals={barchartVals}
        isNested={args.isNested}
      />;
  if (!showDrillDown) return content;
  return (
    <RenderColumnButton {...args}>
      {content}
    </RenderColumnButton>
  );
};

type RenderColumnValueProps = {
  table: DBSchemaTableWithOptions;
  column: RenderedColumn;
  row: Record<string, unknown>;
  maxCellChars: number | undefined;
  getValues: () => unknown[];
  showTitle?: boolean;
};

const RenderColumnValue = ({
  table,
  column,
  row,
  maxCellChars = 500,
  getValues,
  showTitle = true,
}: RenderColumnValueProps) => {
  const { name } = column;
  const format = getColumnFormat(column);
  const formatType = format?.type;
  const formatRender = useMemo(
    () =>
      formatType === "NONE" ? undefined : (
        DISPLAY_FORMATS.find(
          ({ type, match }) =>
            type === formatType || (!formatType && match?.(table, name)),
        )
      ),
    [formatType, name, table],
  );

  const value = row[name];

  if (formatRender) {
    return formatRender.render(
      value,
      row,
      { column, table },
      format!,
      maxCellChars,
    );
  }

  return (
    <RenderValue
      column={column.info ?? column.computedConfig ?? column}
      value={value}
      showTitle={showTitle}
      style={
        (
          column.display === "drillable-records" ||
          column.style?.type === "Fixed" ||
          column.style?.type === "Conditional"
        ) ?
          { color: "inherit" }
        : undefined
      }
      maxLength={maxCellChars}
      maximumFractionDigits={format?.type === "Currency" ? 2 : undefined}
      getValues={getValues}
    />
  );
};
