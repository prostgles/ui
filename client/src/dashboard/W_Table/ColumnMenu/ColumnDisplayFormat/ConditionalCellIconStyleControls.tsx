import { mdiClose, mdiPlus } from "@mdi/js";
import React from "react";
import Btn from "../../../../components/Btn";
import { FlexCol } from "../../../../components/Flex";
import { IconPalette } from "../../../../components/IconPalette/IconPalette";
import { SmartSearch } from "../../../SmartFilter/SmartSearch/SmartSearch";
import type {
  ConditionalStyleIcons,
  StyleColumnProps,
} from "../ColumnStyleControls";
import FormField from "../../../../components/FormField/FormField";

type P = StyleColumnProps & {
  style: ConditionalStyleIcons;
};

export const ConditionalCellIconStyleControls = ({
  column,
  style,
  tableName,
  tables,
  db,
  onUpdate,
}: P) => {
  const updateStyle = (partialStyle: Partial<typeof style>) => {
    onUpdate({ style: { ...style, ...partialStyle } });
  };
  const updateCondStyle = (
    newStyle: ConditionalStyleIcons["valueToIconMap"],
    overWrite = false,
  ) => {
    updateStyle({
      ...style,
      valueToIconMap:
        overWrite ? newStyle : (
          {
            ...style.valueToIconMap,
            ...newStyle,
          }
        ),
    });
  };

  return (
    <FlexCol className="ConditionalCellStyleControls">
      <FormField
        label={"Icon size (px)"}
        value={style.size ?? 24}
        inputProps={{
          type: "number",
          min: 1,
          step: 1,
          max: 200,
        }}
        onChange={(newIconSize) => {
          updateStyle({
            size: newIconSize,
          });
        }}
      />
      {Object.entries(style.valueToIconMap).map(([value, iconName]) => {
        const remove = () => {
          const { [value]: _, ...rest } = style.valueToIconMap;
          updateCondStyle(rest, true);
        };
        return (
          <div
            key={value}
            className="flex-col gap-1 p-p5 ai-start card  "
            style={{ padding: "1em", alignItems: "stretch" }}
          >
            <div className="flex-row gap-0 ai-center">
              <SmartSearch
                className=" "
                key={value.toString()}
                db={db}
                tableName={tableName}
                variant="search-no-shadow"
                tables={tables}
                defaultValue={(value || "").toString()}
                column={column.name}
                onPressEnter={(term) => {
                  updateCondStyle({ [term]: iconName });
                }}
                onChange={(val) => {
                  if (!val) {
                    return;
                  }
                  const { columnValue, term } = val;
                  const newValue = columnValue ?? term;
                  if (!newValue) return;
                  updateCondStyle({ [newValue.toString()]: "" });
                }}
              />
              <Btn title="Remove" iconPath={mdiClose} onClick={remove} />
            </div>
            <IconPalette
              iconName={iconName}
              onChange={(newIconName) => {
                if (!newIconName) {
                  remove();
                } else {
                  updateCondStyle({ [value]: newIconName });
                }
              }}
            />
          </div>
        );
      })}
      <Btn
        title="Add condition style"
        className="w-fit h-fit mt-1"
        color="action"
        variant="faded"
        iconPath={mdiPlus}
        onClick={async () => {
          const firstNonNullValueRow = await db[tableName]?.findOne?.(
            { [column.name]: { $ne: null } },
            { select: { [column.name]: 1 } },
          );
          const firstNonNullValue = firstNonNullValueRow?.[column.name];
          if (firstNonNullValue !== undefined) {
            updateCondStyle({
              [firstNonNullValue]: "",
            });
          } else {
            alert("No data to create a condition style for this column");
          }
        }}
      >
        Add condition
      </Btn>
    </FlexCol>
  );
};
