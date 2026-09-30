import { DEFAULT_CHIP_STYLE } from "@common/ColumnConfig/chipColors";
import { FlexCol, FlexRowWrap } from "@components/Flex";
import { Select } from "@components/Select/Select";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { _PG_numbers, includes } from "prostgles-types";
import type { ValidatedColumnInfo } from "prostgles-types/lib";
import React from "react";
import { type Prgl } from "../../../../App";
import { ColorPicker } from "../ColorPicker";
import type {
  ColumnConfig,
  ColumnStyle,
} from "@common/ColumnConfig/ColumnConfig";
import { ChipStylePalette } from "../ColumnDisplayFormat/ChipStylePalette";
import { ConditionalCellIconStyleControls } from "../ColumnDisplayFormat/ConditionalCellIconStyleControls";
import { ConditionalCellStyleControls } from "../ColumnDisplayFormat/ConditionalCellStyleControls";
import { UpdateColumnGlobalConfig } from "../UpdateColumnGlobalConfig";
import { getValueColors } from "./getValueColors";
import type { BarchartStyle } from "@common/ColumnConfig/columnStyleTypes";
import { MINI_BARCHART_COLOR } from "@common/ColumnConfig/COLOR_PALETTE";

export type StyleColumnProps = Pick<Prgl, "db" | "tables"> & {
  column: ColumnConfig;
  onUpdate: (newCol: Pick<ColumnConfig, "style">) => void;
  tsDataType: ValidatedColumnInfo["tsDataType"];
  udt_name: ValidatedColumnInfo["udt_name"];
  tableName: string;
};

export const ColumnStyleControls = (props: StyleColumnProps) => {
  const { column, onUpdate, tableName, db, tsDataType, udt_name } = props;
  const STYLE_MODES: Array<NonNullable<ColumnStyle["type"]>> = [
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

  const style_type = style.type ?? "None";
  const setStyle = (newStyle: ColumnConfig["style"]) => {
    /* If different style type then full overwrite. Otherwise update */
    if (newStyle?.type && newStyle.type !== style.type) {
      let _newStyle: ColumnStyle = {
        buttonVariant: style.buttonVariant,
        ...newStyle,
      };
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
  const { theme } = usePrgl();

  return (
    <FlexCol className="ColumnStyleControls flex-col gap-1">
      {(column.display === "drillable-records" ||
        column.nested?.display?.type === "drillable-records") && (
        <Select
          label="Button style"
          options={["text", "faded", "filled", "outline"]}
          value={
            style.buttonVariant ??
            (column.nested?.display?.type === "drillable-records" ?
              "faded"
            : "text")
          }
          onChange={(buttonVariant) => updateStylePart({ buttonVariant })}
        />
      )}
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
                column,
                theme,
                tables: props.tables,
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
              value={style.textColor || DEFAULT_CHIP_STYLE.textColor}
              onChange={(textColor) => {
                updateStylePart({ textColor });
              }}
            />
            <ColorPicker
              label="Chip"
              className="m-p5"
              value={style.chipColor || DEFAULT_CHIP_STYLE.color}
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
      <UpdateColumnGlobalConfig tableName={tableName} column={column} />
    </FlexCol>
  );
};
