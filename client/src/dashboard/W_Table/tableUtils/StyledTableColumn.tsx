import { FlexRow, FlexRowWrap } from "@components/Flex";
import { CellBarchart } from "@components/ProgressBar";
import { SvgIcon } from "@components/SvgIcon";
import type { OnColRenderRowInfo } from "@components/Table/Table";
import { _PG_date, _PG_numbers, includes, isObject } from "prostgles-types";
import React from "react";
import type { DBSchemaTablesWJoins } from "src/dashboard/Dashboard/dashboardUtils";
import { RenderValue } from "../../SmartForm/SmartFormField/RenderValue";
import type { ColumnConfig } from "../ColumnMenu/ColumnMenu";
import type {
  ChipStyle,
  ColumnValue,
} from "../ColumnMenu/ColumnStyleControls/ColumnStyleControls";
import { type MinMax } from "../W_Table";
import { blend } from "../colorBlend";
import type { ProstglesTableColumn } from "./getTableCols";
import { kFormatter } from "./kFormatter";
import type { OnRenderColumnProps } from "./onRenderColumn";

type P = Pick<OnColRenderRowInfo, "value" | "renderedVal"> &
  Pick<
    OnRenderColumnProps,
    "maxCellChars" | "column" | "barchartVals" | "tables"
  >;

export const StyledTableColumn = ({
  column: c,
  value: valueOrNestedValue,
  barchartVals,
  renderedVal: renderedValRaw,
  tables,
}: P) => {
  const cellValue = (() => {
    if (!c.nested) {
      return {
        type: "normal" as const,
        value: valueOrNestedValue,
        renderedVal: (
          <RenderValue
            column={c}
            value={valueOrNestedValue}
            style={{ color: "inherit" }}
          />
        ),
      };
    }

    const nestedSingleColumn = getSingleShownNestedColumn(c, tables);
    if (!nestedSingleColumn) {
      return;
    }
    const { colInfo: shownColumnInfo, shownCol } = nestedSingleColumn;
    const firstRow =
      Array.isArray(valueOrNestedValue) ? valueOrNestedValue[0] : undefined;
    const value =
      firstRow && isObject(firstRow) ? firstRow[shownCol.name] : null;
    return {
      type: "nested" as const,
      value,
      renderedVal: (
        <RenderValue
          column={shownColumnInfo}
          value={value}
          style={{ color: "inherit" }}
        />
      ),
    };
  })();

  if (!cellValue) {
    return renderedValRaw;
  }
  const { value, renderedVal } = cellValue;
  if (c.style?.type === "Icons") {
    const valueKey = String(value?.toString() ?? "");
    const iconName = valueKey && c.style.valueToIconMap[valueKey];
    const sizeNum = c.style.size ?? 24;
    const iconNode = iconName && <SvgIcon icon={iconName} size={sizeNum} />;
    return <FlexRow>{iconNode ?? value}</FlexRow>;
  }
  if (c.style?.type === "Barchart" && barchartVals?.[c.name]) {
    const numVal = Number(value);
    const numMin = Number(barchartVals[c.name]?.min ?? 0);
    const numMax = Number(barchartVals[c.name]?.max ?? 0);
    return (
      <CellBarchart
        min={numMin}
        max={numMax}
        barColor={c.style.barColor}
        textColor={c.style.textColor}
        value={numVal}
        message={kFormatter(numVal)}
      />
    );
  } else if (c.style?.type !== "None") {
    const style = getCellStyle(c, c, value, barchartVals?.[c.name]);

    if (
      includes(["Fixed", "Conditional"], c.style?.type) &&
      Array.isArray(value) &&
      c.udt_name.startsWith("_")
    ) {
      return (
        <FlexRowWrap className="gap-p25">
          {value.map((v, i) => (
            <StyledCell
              key={i}
              style={
                c.style?.type === "Scale" ?
                  { textColor: style?.textColor }
                : style
              }
              renderedVal={
                <RenderValue
                  value={v}
                  column={{
                    udt_name: c.udt_name.slice(1) as any,
                    tsDataType: c.tsDataType.slice(0, -2) as any,
                  }}
                  style={
                    style?.textColor ? { color: style.textColor } : undefined
                  }
                  maxLength={55}
                />
              }
              className={c.tsDataType === "number" ? "as-end" : ""}
            />
          ))}
        </FlexRowWrap>
      );
    }
    return (
      <StyledCell
        style={
          c.style?.type === "Scale" ? { textColor: style?.textColor } : style
        }
        renderedVal={renderedVal}
        className={includes(_PG_numbers, c.udt_name) ? "as-end" : ""}
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
  col: ColumnConfig,
  c: Pick<ProstglesTableColumn, "tsDataType" | "udt_name">,
  val: any,
  dataRange: MinMax | undefined,
):
  | {
      textColor?: string;
      chipColor?: string;
      cellColor?: string;
    }
  | undefined => {
  const { style } = col;
  let res: ChipStyle = {};
  if (!style || style.type === "None") {
    res = {};
  } else if (style.type === "Fixed") {
    res = { ...style };
  } else if (style.type === "Conditional") {
    // const val = row[col.name];

    const match = style.conditions.find(({ operator, condition }) => {
      const isNumeric =
        c.udt_name === "int4" ||
        c.udt_name === "float8" ||
        c.udt_name === "numeric" ||
        c.udt_name === "int8" ||
        c.udt_name === "int2" ||
        c.udt_name === "float4" ||
        c.udt_name === "money";
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
    const dateOrNumber = includes(_PG_date, c.udt_name) ? +new Date(val) : +val;
    const { max, min } = dataRange ?? {};

    if (isNumber(dateOrNumber) && isNumber(min) && isNumber(max)) {
      const perc = (dateOrNumber - min) / (max - min);

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
  column: ColumnConfig,
  tables: DBSchemaTablesWJoins,
) => {
  if (!column.nested) return;
  const shownNestedCols = column.nested.columns.filter((nc) => nc.show);
  if (shownNestedCols.length !== 1) return;
  const shownCol = shownNestedCols[0]!;
  const table = tables.find(
    (t) => t.name === column.nested?.path.at(-1)?.table,
  );
  if (!table) return;
  const colInfo =
    shownCol.computedConfig ??
    table.columns.find((col) => col.name === shownCol.name);
  if (!colInfo) return;
  return { colInfo, shownCol, table };
};
