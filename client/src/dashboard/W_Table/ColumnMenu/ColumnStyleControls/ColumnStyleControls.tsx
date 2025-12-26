import { FlexCol, FlexRowWrap } from "@components/Flex";
import { MINI_BARCHART_COLOR } from "@components/ProgressBar";
import { Select } from "@components/Select/Select";
import { _PG_numbers, includes } from "prostgles-types";
import type { ValidatedColumnInfo } from "prostgles-types/lib";
import React from "react";
import { type Prgl } from "../../../../App";
import { appTheme, useReactiveState } from "../../../../appUtils";
import { ColorPicker } from "../ColorPicker";
import { ChipStylePalette } from "../ColumnDisplayFormat/ChipStylePalette";
import { ConditionalCellIconStyleControls } from "../ColumnDisplayFormat/ConditionalCellIconStyleControls";
import type { CONDITION_OPERATORS } from "../ColumnDisplayFormat/ConditionalCellStyleControls";
import { ConditionalCellStyleControls } from "../ColumnDisplayFormat/ConditionalCellStyleControls";
import type { ColumnConfig } from "../ColumnMenu";
import { getValueColors } from "./getValueColors";

export type ColumnValue = string | number | Date | null | undefined | boolean;

type BasicConditionFilter = {
  operator: Exclude<(typeof CONDITION_OPERATORS)[number], "in" | "not in">;
  condition: ColumnValue;
};

type ConditionFilter =
  | BasicConditionFilter
  | {
      operator: "in" | "not in";
      condition: BasicConditionFilter["condition"][];
    };

export type ChipStyle = {
  textColor?: string;
  chipColor?: string;
  cellColor?: string;
  borderColor?: string;
};

export type ConditionalStyle = {
  type: "Conditional";
  conditions: (ConditionFilter & ChipStyle)[];
  defaultStyle?: ChipStyle;
};
export type ConditionalStyleIcons = {
  type: "Icons";
  size?: number;
  valueToIconMap: Record<string, string>;
};
export type FixedStyle = {
  type: "Fixed";
} & ChipStyle;

export type ScaleStyle = {
  type: "Scale";
  textColor: string;
  minColor: string;
  maxColor: string;
};
export type BarchartStyle = {
  type: "Barchart";
  barColor: string;
  textColor: string;
};

export type StyleColumnProps = Pick<Prgl, "db" | "tables"> & {
  column: ColumnConfig;
  onUpdate: (newCol: Pick<ColumnConfig, "style">) => void;
  tsDataType: ValidatedColumnInfo["tsDataType"];
  udt_name: ValidatedColumnInfo["udt_name"];
  tableName: string;
};

export const ColumnStyleControls = (props: StyleColumnProps) => {
  const { column, onUpdate, tsDataType, udt_name, tableName, db } = props;

  const STYLE_MODES: Array<Required<ColumnConfig>["style"]["type"]> = [
    "None",
    "Fixed",
    "Conditional",
    "Icons",
  ];
  const { style = { type: "None" as const } } = column;

  if (
    ["number", "Date"].includes(tsDataType) ||
    includes(_PG_numbers, udt_name)
  ) {
    STYLE_MODES.push("Scale");
    STYLE_MODES.push("Barchart");
  }

  const style_type = style.type;
  const setStyle = (newStyle: ColumnConfig["style"]) => {
    /* If different style type then full overwrite. Otherwise update */
    if (newStyle?.type && newStyle.type !== style.type) {
      let _newStyle = { ...newStyle };
      if (newStyle.type === "Barchart") {
        _newStyle = {
          barColor: "rgba(0,246,96,1)",
          textColor: "black",
          ..._newStyle,
        } as BarchartStyle;
      }
      onUpdate({ style: _newStyle });
    } else {
      onUpdate({ style: { ...style, ...newStyle } });
    }
  };

  const updateStylePart = (
    newStyle: Partial<Required<ColumnConfig>["style"]>,
  ) => {
    setStyle({ ...style, ...newStyle } as typeof style);
  };
  const { state: theme } = useReactiveState(appTheme);
  return (
    <FlexCol className="ColumnStyleControls flex-col gap-1">
      <Select
        label="Style mode"
        value={style_type}
        variant="div"
        options={STYLE_MODES}
        onChange={(type) => {
          if (type === "Conditional") {
            void getValueColors(
              {
                type: "table",
                db,
                tableName,
                columnName: column.name,
                theme: theme,
              },
              setStyle,
            );
          } else {
            setStyle(
              type === "Scale" ?
                {
                  type,
                  minColor: "#8fccf0",
                  maxColor: "#0AA1FA",
                  textColor: "#1c1c1c",
                }
              : type === "Barchart" ?
                { type, barColor: MINI_BARCHART_COLOR, textColor: "#646464" }
              : type === "Fixed" ? { type }
              : type === "Icons" ? { type, valueToIconMap: {} }
              : { type },
            );
          }
        }}
      />

      {style.type === "Fixed" ?
        <>
          <FlexRowWrap>
            <ColorPicker
              label="Text"
              className="m-p5"
              value={style.textColor || "black"}
              onChange={(textColor) => {
                updateStylePart({ textColor });
              }}
            />
            <ColorPicker
              label="Chip"
              className="m-p5"
              value={style.chipColor || "red"}
              onChange={(chipColor) => {
                updateStylePart({ chipColor });
              }}
            />
            <ColorPicker
              label="Cell"
              className="m-p5"
              value={style.cellColor || "white"}
              onChange={(cellColor) => {
                updateStylePart({ cellColor });
              }}
            />
            <ColorPicker
              label="Border"
              className="m-p5"
              value={style.borderColor || "transparent"}
              onChange={(borderColor) => {
                updateStylePart({ borderColor });
              }}
            />
          </FlexRowWrap>
          <ChipStylePalette
            onChange={({ borderColor, color, textColor }) =>
              updateStylePart({ borderColor, textColor, chipColor: color })
            }
          />
        </>
      : style.type === "Conditional" ?
        <ConditionalCellStyleControls {...props} style={style} />
      : style.type === "Icons" ?
        <ConditionalCellIconStyleControls {...props} style={style} />
      : style.type === "Scale" ?
        <FlexRowWrap>
          <ColorPicker
            className="mr-p5"
            label="Min color"
            value={style.minColor}
            onChange={(minColor) => {
              updateStylePart({ minColor });
            }}
          />
          <ColorPicker
            className="mr-p5"
            label="Max color"
            value={style.maxColor}
            onChange={(maxColor) => {
              updateStylePart({ maxColor });
            }}
          />
          <ColorPicker
            className="mr-p5"
            label="Text"
            value={style.textColor}
            onChange={(textColor) => {
              updateStylePart({ textColor });
            }}
          />
        </FlexRowWrap>
      : style.type === "Barchart" ?
        <FlexRowWrap>
          <ColorPicker
            label="Bar"
            className="m-p5"
            value={style.barColor}
            onChange={(barColor) => {
              updateStylePart({ barColor });
            }}
          />
          <ColorPicker
            label="Text"
            className="m-p5"
            value={style.textColor}
            onChange={(textColor) => {
              updateStylePart({ textColor });
            }}
          />
        </FlexRowWrap>
      : null}
    </FlexCol>
  );
};

export const getRandomElement = <Arr,>(
  items: Arr[],
): { elem: Arr; index: number } => {
  const randomIndex = Math.floor(Math.random() * items.length);
  return { elem: items[randomIndex]!, index: randomIndex };
};
