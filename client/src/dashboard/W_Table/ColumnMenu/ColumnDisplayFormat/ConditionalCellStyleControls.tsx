import { mdiClose, mdiPlus } from "@mdi/js";
import React from "react";
import Btn from "../../../../components/Btn";
import { FlexCol, FlexRow } from "../../../../components/Flex";
import PopupMenu from "../../../../components/PopupMenu";
import Select from "../../../../components/Select/Select";
import { SmartSearch } from "../../../SmartFilter/SmartSearch/SmartSearch";
import { StyledCell } from "../../tableUtils/StyledTableColumn";
import { ColorPicker } from "../ColorPicker";
import type {
  ConditionalStyle,
  StyleColumnProps,
} from "../ColumnStyleControls";
import { ChipStylePalette } from "./ChipStylePalette";
import { isDefined } from "../../../../utils";

export const CONDITION_OPERATORS = [
  "=",
  "<=",
  "<",
  ">",
  ">=",
  "!=",
  "in",
  "not in",
  "contains",
  "not null",
  "null",
] as const;

type P = StyleColumnProps & {
  style: ConditionalStyle;
};

export const ConditionalCellStyleControls = ({
  column,
  style,
  tableName,
  tables,
  db,
  onUpdate,
}: P) => {
  const conditions = style.conditions;

  const updateStyle = (partialStyle: Partial<typeof style>) => {
    onUpdate({ style: { ...style, ...partialStyle } });
  };
  const updateCondStyle = (
    newStyle: Partial<ConditionalStyle["conditions"][number]> | null,
    idx: number | undefined,
  ) => {
    let newConditions = conditions.map((c) => ({ ...c }));
    if (!newStyle) {
      newConditions = newConditions.filter((_c, _i) => _i !== idx);
    } else if (idx === undefined) {
      newConditions.push({ chipColor: "red", operator: "=", condition: "" });
    } else {
      newConditions = newConditions.map((cs, i) => {
        if (i === idx) return { ...cs, ...newStyle };
        return cs;
      }) as any;
    }
    updateStyle({ conditions: newConditions });
  };

  return (
    <FlexCol className="ConditionalCellStyleControls">
      {conditions.map((cs, condIdx) => (
        <div
          key={condIdx}
          className="flex-col gap-1 p-p5 ai-start card  "
          style={{ padding: "1em", alignItems: "stretch" }}
        >
          <div className="flex-row-wrap gap-0 ai-center">
            <Btn color="action" variant="faded">
              {column.name}
            </Btn>
            <Select
              className="ml-p25"
              value={cs.operator}
              variant="div"
              options={CONDITION_OPERATORS}
              onChange={(operator) => updateCondStyle({ operator }, condIdx)}
            />
            {cs.operator !== "not null" && cs.operator !== "null" && (
              <SmartSearch
                className=" "
                key={(cs.condition ?? "").toString()}
                db={db}
                tableName={tableName}
                style={{
                  padding: ".5em",
                }}
                variant="search-no-shadow"
                tables={tables}
                defaultValue={(cs.condition ?? "").toString()}
                column={column.name}
                onPressEnter={(term) => {
                  updateCondStyle({ condition: term }, condIdx);
                }}
                onChange={(val) => {
                  if (!val) {
                    return;
                  }
                  const { columnValue, term } = val;
                  const condition = columnValue ?? term;
                  if (!isDefined(condition)) return;
                  updateCondStyle({ condition }, condIdx);
                }}
              />
            )}
            <Btn
              title="Remove style"
              iconPath={mdiClose}
              onClick={(e) => {
                updateCondStyle(null, condIdx);
              }}
            />
          </div>

          <PopupMenu
            button={
              <div className="flex-row ai-center gap-1 pointer noselect">
                <div>Chip style</div>
                <StyledCell
                  style={{
                    chipColor: cs.chipColor,
                    textColor: cs.textColor ?? style.defaultStyle?.textColor,
                    borderColor: cs.borderColor,
                  }}
                  renderedVal={(cs.condition ?? "Result").toString()}
                />
              </div>
            }
            positioning="center"
            clickCatchStyle={{ opacity: 0.5 }}
            footerButtons={[
              {
                label: "Done",
                variant: "filled",
                color: "action",
                onClickClose: true,
              },
            ]}
            render={() => (
              <FlexCol>
                <FlexRow className="jc-start ai-center  gap-1 o-auto f-1">
                  <ColorPicker
                    label="Text:"
                    value={
                      cs.textColor ?? style.defaultStyle?.textColor ?? "black"
                    }
                    onChange={(textColor) => {
                      updateStyle({
                        defaultStyle: { ...style.defaultStyle, textColor },
                      });
                      updateCondStyle({ textColor }, condIdx);
                    }}
                  />
                  <ColorPicker
                    label="Chip"
                    value={cs.chipColor ?? "transparent"}
                    onChange={(chipColor) => {
                      updateCondStyle({ chipColor }, condIdx);
                    }}
                  />
                  <ColorPicker
                    label="Border:"
                    className="mr-auto"
                    value={cs.borderColor ?? "transparent"}
                    onChange={(borderColor) => {
                      updateCondStyle({ borderColor }, condIdx);
                    }}
                  />

                  <FlexRow className="ai-center gap-1">
                    <div>Chip style</div>
                    <StyledCell
                      style={{
                        chipColor: cs.chipColor,
                        textColor:
                          cs.textColor ?? style.defaultStyle?.textColor,
                        borderColor: cs.borderColor,
                      }}
                      renderedVal={"Result"}
                    />
                  </FlexRow>
                </FlexRow>

                <ChipStylePalette
                  onChange={(chipStyle) => {
                    updateCondStyle(
                      { ...chipStyle, chipColor: chipStyle.color },
                      condIdx,
                    );
                  }}
                />
              </FlexCol>
            )}
          />
        </div>
      ))}
      <Btn
        title="Add condition style"
        className="w-fit h-fit mt-1"
        color="action"
        variant="faded"
        iconPath={mdiPlus}
        onClick={() => {
          updateCondStyle({}, undefined);
        }}
      >
        Add condition
      </Btn>
      <FlexRow className="flex-row p-p5 ai-center">
        <ColorPicker
          label="Default chip color:"
          className="mr-p5"
          value={style.defaultStyle?.chipColor ?? "transparent"}
          onChange={(chipColor) => {
            updateStyle({ defaultStyle: { ...style.defaultStyle, chipColor } });
          }}
        />
      </FlexRow>
    </FlexCol>
  );
};
