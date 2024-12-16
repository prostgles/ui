import type { DBSchemaTable, ValidatedColumnInfo } from "prostgles-types";
import React from "react";
import { MediaViewer } from "../../../components/MediaViewer";
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
  c: RenderedColumn;
  tables: DBSchemaTablesWJoins;
  table: DBSchemaTable | undefined;
  maxCellChars?: number;
  barchartVals: MinMaxVals | undefined;
  maximumFractionDigits?: number | undefined;
};
export const onRenderColumn = ({
  c,
  table,
  tables,
  maxCellChars = 500,
  barchartVals,
  maximumFractionDigits,
}: OnRenderColumnProps) => {
  const formatRender = DISPLAY_FORMATS.find(
    (df) =>
      df.type !== "NONE" &&
      ((table && df.match?.(table, c)) ?? df.type === c.format?.type),
  );
  const onRender: ProstglesTableColumn["onRender"] =
    c.nested ?
      ({ value, row }) => {
        // const nestedTimeChartDates: number[] | undefined = c.nested?.chart && value && value.flatMap(nr => isObject(nr)? +new Date(nr.date) : -1)
        // const allDatesAreValid = nestedTimeChartDates && nestedTimeChartDates.every(d => Number.isFinite(d));
        // const nestedTimeChartMeta: NestedTimeChartMeta | undefined = !allDatesAreValid? undefined : {
        //   fullExtent: [
        //     new Date(Math.min(...nestedTimeChartDates)),
        //     new Date(Math.max(...nestedTimeChartDates)),
        //   ]
        // };
        const chartLimits = barchartVals?.[c.name];
        const nestedTimeChartMeta: NestedTimeChartMeta | undefined =
          chartLimits ?
            {
              fullExtent: [
                new Date(chartLimits.min),
                new Date(chartLimits.max),
              ],
            }
          : undefined;

        return (
          <NestedColumnRender
            value={value}
            row={row}
            c={c}
            tables={tables}
            nestedTimeChartMeta={nestedTimeChartMeta}
          />
        );
      }
    : c.style && c.style.type !== "None" ?
      (rowInfo) => (
        <StyledTableColumn
          {...rowInfo}
          c={c}
          maxCellChars={maxCellChars}
          barchartVals={barchartVals}
        />
      )
    : formatRender ?
      ({ row }) => {
        let value = row[c.name];

        const connectionId = location.pathname
          .split("/")
          .find((p, i, arr) => arr[i - 1] === "connections");
        if (c.info?.file) {
          if (!value && c.format?.type === "Media") return null;
          value = `/prostgles_media/${connectionId}/${row[c.name]}`;
        }
        return formatRender.render(value, row, c, c.format!, maxCellChars);
      }
    : table?.info.isFileTable && c.name === "url" ?
      ({ value, row }) => {
        return <MediaViewer key={value} url={value} />;
      }
      // c.udt_name.startsWith("json")?  ({ row }) =>  <JsonRenderer value={row[c.name]} /> :
    : /** Not pretty enough */
    c.udt_name === "interval" ?
      ({ row }) =>
        Object.keys(row[c.name] ?? {})
          .map((k) => `${row[c.name][k]} ${k}`)
          .join(", ")
    : /** c.tsDataType and c.udt_name SHOULD NOT BE MISSING AT THIS POINT! */
      ({ value }) => (
        <RenderValue
          column={c.computedConfig?.funcDef.outType ?? c}
          value={value}
          showTitle={true}
          maxLength={maxCellChars}
          maximumFractionDigits={maximumFractionDigits}
        />
      );

  return onRender;
};
