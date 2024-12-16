import type { AnyObject } from "prostgles-types";
import { _PG_date, isDefined } from "prostgles-types";
import React from "react";
import { FlexRow, FlexRowWrap } from "../../../components/Flex";
import { CellBarchart } from "../../../components/ProgressBar";
import type { OnColRenderRowInfo } from "../../../components/Table/Table";
import { RenderValue } from "../../SmartForm/SmartFormField/RenderValue";
import type { ColumnConfig } from "../ColumnMenu/ColumnMenu";
import type { ChipStyle, ColumnValue } from "../ColumnMenu/ColumnStyleControls";
import { kFormatter, type MinMax } from "../W_Table";
import { blend } from "../colorBlend";
import type { ProstglesTableColumn } from "./getTableCols";
import type { OnRenderColumnProps } from "./onRenderColumn";
import { SvgIcon } from "../../../components/SvgIcon";

type P = OnColRenderRowInfo &
  Pick<OnRenderColumnProps, "maxCellChars" | "c" | "barchartVals">;

export const StyledTableColumn = ({
  c,
  value,
  row,
  barchartVals,
  renderedVal,
}: P) => {
  if (c.style?.type === "Icons") {
    const valueKey = value?.toString() ?? "";
    const iconName = valueKey && c.style.valueToIconMap[valueKey];
    const sizeNum = c.style.size ?? 24;
    const iconNode = iconName && <SvgIcon icon={iconName} size={sizeNum} />;
    return <FlexRow>{iconNode ?? value}</FlexRow>;
  }
  if (c.style?.type === "Barchart" && barchartVals?.[c.name]) {
    return (
      <CellBarchart
        style={{ marginTop: "6px" }}
        min={barchartVals[c.name]?.min ?? 0}
        max={barchartVals[c.name]?.max ?? 0}
        barColor={c.style.barColor}
        textColor={c.style.textColor}
        value={value}
        message={kFormatter(value)}
        // message={SmartFormField.renderValue(c, row[c.name], undefined, maxCellChars)}
      />
    );
  } else if (c.style?.type !== "None") {
    const style = getCellStyle(c, c, row, barchartVals?.[c.name]);

    if (
      ["Fixed", "Conditional"].includes(c.style?.type as any) &&
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
        className={_PG_date.includes(c.udt_name as any) ? "" : "as-end"}
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
  renderedVal: any;
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
            padding: "6px 8px",
            borderRadius: "26px",
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
  row: AnyObject,
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
    const val = row[col.name];

    const match = style.conditions.find(({ operator, condition }) => {
      const isNumeric =
        c.udt_name === "int4" ||
        c.udt_name === "float8" ||
        c.udt_name === "numeric" ||
        c.udt_name === "int8" ||
        c.udt_name === "int2" ||
        c.udt_name === "float4" ||
        c.udt_name === "money";
      const cval =
        isNumeric ? +(condition as string) : (condition as ColumnValue);
      if (operator === "contains") {
        return val && `${JSON.stringify(val)}`.includes(cval + "");
      } else if (operator === "=") {
        return val == cval;
      } else if (operator === ">") {
        return cval !== undefined && cval !== null && val > cval;
      } else if (operator === ">=") {
        return cval !== undefined && cval !== null && val >= cval;
      } else if (operator === "<=") {
        return cval !== undefined && cval !== null && val <= cval;
      } else if (operator === "<") {
        return cval !== undefined && cval !== null && val < cval;
      } else if (operator === "!=") {
        return val != cval;
      } else if (operator === "in" || operator === "not in") {
        const is_in = condition.includes(val);

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
    const val =
      _PG_date.includes(c.udt_name as any) ?
        +new Date(row[col.name])
      : +row[col.name];
    const { max, min } = dataRange ?? {};

    if (isNumber(val) && isNumber(min) && isNumber(max)) {
      const perc = (val - min) / (max - min);

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
