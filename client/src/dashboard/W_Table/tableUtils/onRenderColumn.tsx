import { DBSchemaTable, ValidatedColumnInfo, isObject } from "prostgles-types";
import React from "react";
import MediaViewer from "../../../components/MediaViewer";
import { DBSchemaTablesWJoins } from "../../Dashboard/dashboardUtils";
import SmartFormField from "../../SmartForm/SmartFormField/SmartFormField";
import { NestedColumnRender, NestedTimeChartMeta } from "../ColumnMenu/ColumnDisplayFormat/NestedColumnRender";
import { DISPLAY_FORMATS } from "../ColumnMenu/ColumnDisplayFormat/columnFormatUtils";
import { MinMaxVals, ColumnConfigWInfo } from "../W_Table";
import { StyledTableColumn } from "./StyledTableColumn";
import { ProstglesTableColumn } from "./getTableCols";
import { RenderValue } from "../../SmartForm/SmartFormField/RenderValue";

export type RenderedColumn = 
  ColumnConfigWInfo &
  Pick<ValidatedColumnInfo, "tsDataType" | "udt_name" | "name"> & 
  Pick<ProstglesTableColumn, "format">;// | "noSanitize" | "contentConfig" | "allowedHTMLTags">;
export type OnRenderColumnProps = {
  c: RenderedColumn;
  tables: DBSchemaTablesWJoins;
  table: DBSchemaTable | undefined;
  maxCellChars?: number;
  barchartVals: MinMaxVals | undefined;
  maximumFractionDigits?: number | undefined;
}
export const onRenderColumn = ({ c, table, tables, maxCellChars = 500, barchartVals, maximumFractionDigits }: OnRenderColumnProps) => {
  const formatRender = DISPLAY_FORMATS.find(df => df.type !== "NONE" && ((table && df.match?.(table, c)) ?? df.type === c.format?.type));
  const onRender: ProstglesTableColumn["onRender"] =
    c.nested? ({ value, row }) => {

      // const nestedTimeChartDates: number[] | undefined = c.nested?.chart && value && value.flatMap(nr => isObject(nr)? +new Date(nr.date) : -1)
      // const allDatesAreValid = nestedTimeChartDates && nestedTimeChartDates.every(d => Number.isFinite(d));
      // const nestedTimeChartMeta: NestedTimeChartMeta | undefined = !allDatesAreValid? undefined : {
      //   fullExtent: [
      //     new Date(Math.min(...nestedTimeChartDates)),
      //     new Date(Math.max(...nestedTimeChartDates)),
      //   ]
      // };
      const chartLimits = barchartVals?.[c.name];
      const nestedTimeChartMeta: NestedTimeChartMeta | undefined = chartLimits? {
        fullExtent: [
          new Date(chartLimits.min),
          new Date(chartLimits.max),
        ]
      } : undefined

      return <NestedColumnRender 
        value={value} 
        row={row} 
        c={c} 
        tables={tables} 
        nestedTimeChartMeta={nestedTimeChartMeta} 
      />
    } :

    c.style && c.style.type !== "None" ? (rowInfo) => 
      <StyledTableColumn 
        {...rowInfo} 
        c={c} 
        maxCellChars={maxCellChars} 
        barchartVals={barchartVals} 
      /> :

    formatRender? ({ row }) => {
      return formatRender.render(row[c.name], row, c, c.format!, maxCellChars)
    } :
    table?.info.isFileTable && c.name === "url"? ({ value, row }) => {
      return <MediaViewer
        key={value}
        url={value}
        allowedContentTypes={
          [MediaViewer.getMimeFromURL(value)!]
        }
      />
    } :
    /** Not pretty enough */
    // c.udt_name.startsWith("json")?  ({ row }) =>  <JsonRenderer value={row[c.name]} /> :
    c.udt_name === "interval" ?
      ({ row }) => Object.keys(row[c.name] ?? {}).map(k => `${row[c.name][k]} ${k}`).join(", ") :

    /** c.tsDataType and c.udt_name SHOULD NOT BE MISSING AT THIS POINT! */ 
    // ({ row }) => SmartFormField.renderValue(c, row[c.name], undefined, maxCellChars);
    ({ value }) => <RenderValue column={c} value={value} showTitle={true} maxLength={maxCellChars} maximumFractionDigits={maximumFractionDigits} />;

  return onRender
}