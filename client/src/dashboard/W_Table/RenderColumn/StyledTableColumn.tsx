import { FlexRow, FlexRowWrap } from "@components/Flex";
import { CellBarchart } from "@components/ProgressBar";
import { SvgIcon } from "@components/SvgIcon";
import type { OnColRenderRowInfo } from "@components/Table/Table";
import { _PG_date, _PG_numbers, includes } from "prostgles-types";
import React from "react";
import type { DBSchemaTablesWJoins } from "src/dashboard/Dashboard/dashboardUtils";
import { RenderValue } from "../../SmartForm/SmartFormField/RenderValue";
import type { ColumnConfig } from "@common/ColumnConfig/ColumnConfig";
import type {
  ChipStyle,
  ColumnValue,
} from "@common/ColumnConfig/columnStyleTypes";
import { type MinMax } from "../W_Table";
import { blend } from "../colorBlend";
import type { ProstglesTableColumn } from "../tableUtils/getTableCols";
import { kFormatter } from "../tableUtils/kFormatter";
import type { RenderColumnProps } from "./RenderColumn";

type P = Pick<OnColRenderRowInfo, "value" | "renderedVal" | "row"> &
  Pick<RenderColumnProps, "barchartVals" | "tables" | "table" | "isNested"> & {
    formattedValue?: React.ReactNode;
    column: Pick<ColumnConfig, "name" | "style" | "nested"> &
      Pick<ProstglesTableColumn, "tsDataType" | "udt_name">;
  };

export const StyledTableColumn = ({
  column,
  row,
  formattedValue,
  value: valueOrNestedValue,
  barchartVals,
  isNested,
  renderedVal: renderedValRaw,
  table,
}: P) => {
  if (column.nested) return renderedValRaw;
  const value = valueOrNestedValue;
  const renderedVal = formattedValue ?? renderedValRaw;
  const chartValues = barchartVals?.get(column.name);
  const range = chartValues?.type !== "nested" ? chartValues?.range : undefined;
  if (column.style?.type === "Icons") {
    const valueKey = String(value?.toString() ?? "");
    const iconName = valueKey && column.style.valueToIconMap[valueKey];
    const sizeNum = column.style.size ?? 24;
    const iconNode = iconName && <SvgIcon icon={iconName} size={sizeNum} />;
    return <FlexRow>{iconNode || renderedVal}</FlexRow>;
  }
  if (
    column.style?.type === "Barchart" &&
    range &&
    value != null &&
    Number.isFinite(range.min) &&
    Number.isFinite(range.max)
  ) {
    const numVal =
      (
        chartValues?.type === "date" &&
        (typeof value === "string" || value instanceof Date)
      ) ?
        +new Date(value)
      : Number(value);
    const numMin = range.min;
    const numMax = range.max;
    return (
      <CellBarchart
        min={numMin}
        max={numMax}
        barColor={column.style.barColor}
        textColor={column.style.textColor}
        value={numVal}
        message={
          formattedValue ??
          (chartValues?.type === "date" ? renderedVal : kFormatter(numVal))
        }
      />
    );
  } else if (column.style?.type !== "None") {
    const style = getColumnValueStyle({ column, table, row, barchartVals });

    if (
      includes(["Fixed", "Conditional"], column.style?.type) &&
      Array.isArray(value) &&
      column.udt_name.startsWith("_")
    ) {
      return (
        <FlexRowWrap className="gap-p25">
          {value.map((v, i) => (
            <StyledCell
              key={i}
              style={
                column.style?.type === "Scale" && !isNested ?
                  { textColor: style?.textColor }
                : style
              }
              renderedVal={
                <RenderValue
                  value={v}
                  column={{
                    udt_name: column.udt_name.slice(
                      1,
                    ) as typeof column.udt_name,
                    tsDataType: column.tsDataType.slice(
                      0,
                      -2,
                    ) as typeof column.tsDataType,
                  }}
                  style={
                    style?.textColor ? { color: style.textColor } : undefined
                  }
                  maxLength={55}
                />
              }
              className={column.tsDataType === "number" ? "as-end" : ""}
            />
          ))}
        </FlexRowWrap>
      );
    }
    return (
      <StyledCell
        style={
          column.style?.type === "Scale" && !isNested ?
            { textColor: style?.textColor }
          : style
        }
        renderedVal={renderedVal}
        className={includes(_PG_numbers, column.udt_name) ? "as-end" : ""}
      />
    );
  }

  return renderedVal;
};

export const StyledCell = ({
  style,
  renderedVal,
  className = "",
}: {
  renderedVal: React.ReactNode;
  style: ChipStyle | undefined;
  className?: string;
}) => {
  if (style) {
    return (
      <div
        className={className}
        style={{
          ...(style.chipColor && {
            backgroundColor: style.chipColor,
            padding: "4px 8px",
            borderRadius: "12px",
            width: "fit-content",
            whiteSpace: "nowrap",
          }),
          ...(style.cellColor && {
            backgroundColor: style.cellColor,
            padding: 0,
            borderRadius: 0,
            width: "100%",
            height: "100%",
          }),
          ...(style.textColor && { color: style.textColor }),
          ...(style.borderColor && {
            border: `1px solid ${style.borderColor}`,
          }),
          /**
           * Prevent left side overflow when showing numbers with "as-end"
           */
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {renderedVal}
      </div>
    );
  }

  return renderedVal;
};

export const getCellStyle = (
  { style, udt_name }: Pick<ProstglesTableColumn, "udt_name" | "style">,
  val: any,
  dataRange: MinMax | undefined,
): ChipStyle | undefined => {
  let res: ChipStyle = {};
  if (!style || style.type === "None") {
    res = {};
  } else if (style.type === "Fixed") {
    res = { ...style };
  } else if (style.type === "Conditional") {
    // const val = row[col.name];

    const match = style.conditions.find(({ operator, condition }) => {
      const isNumeric =
        udt_name === "int4" ||
        udt_name === "float8" ||
        udt_name === "numeric" ||
        udt_name === "int8" ||
        udt_name === "int2" ||
        udt_name === "float4" ||
        udt_name === "money";
      const conditionalValue =
        isNumeric ? +(condition as string) : (condition as ColumnValue);
      if (operator === "contains") {
        return (
          val &&
          `${JSON.stringify(val)}`.includes(conditionalValue?.toString() + "")
        );
      } else if (operator === "=") {
        return val == conditionalValue;
      } else if (operator === ">") {
        return (
          conditionalValue !== undefined &&
          conditionalValue !== null &&
          val > conditionalValue
        );
      } else if (operator === ">=") {
        return (
          conditionalValue !== undefined &&
          conditionalValue !== null &&
          val >= conditionalValue
        );
      } else if (operator === "<=") {
        return (
          conditionalValue !== undefined &&
          conditionalValue !== null &&
          val <= conditionalValue
        );
      } else if (operator === "<") {
        return (
          conditionalValue !== undefined &&
          conditionalValue !== null &&
          val < conditionalValue
        );
      } else if (operator === "!=") {
        return val != conditionalValue;
      } else if (operator === "in" || operator === "not in") {
        const is_in = includes(condition, val);

        if (operator === "in") return is_in;
        else return !is_in;
      }
    });

    if (!match && style.defaultStyle) {
      res = {
        ...style.defaultStyle,
      };
    }

    if (match) {
      res = {
        ...style.defaultStyle,
        ...match,
      };
    }
  } else if (style.type === "Scale") {
    const {
      textColor = "black",
      minColor = "#63f717",
      maxColor = "#46b5d5",
    } = style;
    const dateOrNumber = includes(_PG_date, udt_name) ? +new Date(val) : +val;
    const { max, min } = dataRange ?? {};

    if (
      val != null &&
      isNumber(dateOrNumber) &&
      isNumber(min) &&
      isNumber(max)
    ) {
      const perc = max === min ? 0 : (dateOrNumber - min) / (max - min);

      res = {
        textColor,
        cellColor: blend(minColor, maxColor, perc),
      };
    }
  }

  return res;
};

export const isNumber = (v: any): v is number => {
  return Number.isFinite(v);
};

export const getSingleShownNestedColumn = (
  column: Pick<ColumnConfig, "nested">,
  tables: DBSchemaTablesWJoins,
) => {
  if (!column.nested) return;
  const table = tables.find(
    (t) => t.name === column.nested?.path.at(-1)?.table,
  );
  if (!table) return;
  const shownNestedCols = column.nested.columns.filter((nc) => nc.show);
  if (shownNestedCols.length !== 1) return;
  const shownCol = shownNestedCols[0]!;
  const colInfo =
    shownCol.computedConfig ??
    table.columns.find((col) => col.name === shownCol.name);
  if (!colInfo) return;
  return { colInfo, shownCol, table };
};

export const getColumnValueStyle = ({
  column,
  table,
  row,
  barchartVals,
}: Pick<P, "column" | "table" | "row" | "barchartVals">) => {
  const conditionColumn =
    column.style?.type === "Conditional" ? column.style.column : undefined;
  const valueColumn =
    conditionColumn && table.columns.find((c) => c.name === conditionColumn);
  const chartValues = barchartVals?.get(column.name);
  return getCellStyle(
    {
      ...column,
      udt_name: valueColumn ? valueColumn.udt_name : column.udt_name,
    },
    row[conditionColumn || column.name],
    chartValues?.type !== "nested" ? chartValues?.range : undefined,
  );
};
