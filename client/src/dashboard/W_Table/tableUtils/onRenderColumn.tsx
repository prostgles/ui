import { ROUTES } from "@common/utils";
import { MediaViewer } from "@components/MediaViewer/MediaViewer";
import type { DBSchemaTable, ValidatedColumnInfo } from "prostgles-types";
import React from "react";
import type { DBSchemaTablesWJoins } from "../../Dashboard/dashboardUtils";
import { RenderValue } from "../../SmartForm/SmartFormField/RenderValue";
import type { NestedTimeChartMeta } from "../ColumnMenu/ColumnDisplayFormat/NestedColumnRender";
import { NestedColumnRender } from "../ColumnMenu/ColumnDisplayFormat/NestedColumnRender";
import { DISPLAY_FORMATS } from "../ColumnMenu/ColumnDisplayFormat/columnFormatUtils";
import type { ColumnConfigWInfo, MinMaxVals } from "../W_Table";
import { StyledTableColumn } from "./StyledTableColumn";
import type { ProstglesTableColumn } from "./getTableCols";

export type RenderedColumn = ColumnConfigWInfo &
  Pick<ValidatedColumnInfo, "tsDataType" | "udt_name" | "name"> &
  Pick<ProstglesTableColumn, "format">; // | "noSanitize" | "contentConfig" | "allowedHTMLTags">;
export type OnRenderColumnProps = {
  column: RenderedColumn;
  getValues: () => any[];
  tables: DBSchemaTablesWJoins;
  table: DBSchemaTable | undefined;
  maxCellChars?: number;
  barchartVals: MinMaxVals | undefined;
  maximumFractionDigits?: number | undefined;
};
export const onRenderColumn = (args: OnRenderColumnProps) => {
  const {
    column,
    table,
    tables,
    maxCellChars = 500,
    barchartVals,
    getValues,
    maximumFractionDigits,
  } = args;
  const formatRender = DISPLAY_FORMATS.find(
    ({ type, match }) =>
      type !== "NONE" &&
      ((table && match?.(table, column)) ?? type === column.format?.type),
  );
  const onRender: ProstglesTableColumn["onRender"] =
    column.style && column.style.type !== "None" ?
      (rowInfo) => (
        <StyledTableColumn
          {...rowInfo}
          tables={tables}
          column={column}
          maxCellChars={maxCellChars}
          barchartVals={barchartVals}
        />
      )
    : column.nested ?
      ({ value, row }) => {
        const chartLimits = barchartVals?.[column.name];
        const nestedTimeChartMeta: NestedTimeChartMeta | undefined =
          chartLimits && {
            fullExtent: [new Date(chartLimits.min), new Date(chartLimits.max)],
          };

        return (
          <NestedColumnRender
            value={value}
            row={row}
            c={column}
            tables={tables}
            nestedTimeChartMeta={nestedTimeChartMeta}
            getValues={getValues}
          />
        );
      }
    : formatRender ?
      ({ row }) => {
        let value = row[column.name];

        const connectionId = location.pathname
          .split("/")
          .find((p, i, arr) => arr[i - 1] === "connections");
        if (column.info?.file) {
          if (!value && column.format?.type === "Media") return null;
          value = `${ROUTES.STORAGE}/${connectionId}/${row[column.name]}`;
        }
        return formatRender.render(
          value,
          row,
          column,
          column.format!,
          maxCellChars,
        );
      }
    : table?.isFileTable && column.name === "url" ?
      ({ value, row }) => {
        return <MediaViewer key={value} url={value} />;
      }
    : /** Not pretty enough */
    column.udt_name === "interval" ?
      ({ row }) =>
        Object.keys(row[column.name] ?? {})
          .map((k) => `${row[column.name][k]} ${k}`)
          .join(", ")
    : /** c.tsDataType and c.udt_name SHOULD NOT BE MISSING AT THIS POINT! */
      ({ value }) => (
        <RenderValue
          column={column.computedConfig ?? column}
          value={value}
          showTitle={true}
          maxLength={maxCellChars}
          maximumFractionDigits={maximumFractionDigits}
          getValues={getValues}
        />
      );

  return onRender;
};
