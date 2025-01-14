import { useEffectDeep } from "prostgles-client/dist/prostgles";
import React from "react";
import { appTheme, useReactiveState } from "../../appUtils";
import type { DivProps } from "../../components/Flex";
import { FlexRow, classOverride } from "../../components/Flex";
import { isDefined } from "../../utils";
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import type { WindowSyncItem } from "../Dashboard/dashboardUtils";
import { PALETTE } from "../Dashboard/dashboardUtils";
import { getSmartGroupFilter } from "../SmartFilter/smartFilterUtils";
import { ColorPicker } from "../W_Table/ColumnMenu/ColorPicker";
import type { ColumnConfig } from "../W_Table/ColumnMenu/ColumnMenu";
import {
  type ColumnValue,
  DefaultConditionalStyleLimit,
  setDefaultConditionalStyle,
} from "../W_Table/ColumnMenu/ColumnStyleControls";
import { updateWCols } from "../W_Table/tableUtils/tableUtils";
import type { ProstglesTimeChartStateLayer } from "../W_TimeChart/W_TimeChart";

type P = DivProps &
  Pick<CommonWindowProps, "getLinksAndWindows" | "myLinks" | "prgl" | "w"> & {
    layerLinkId: string;
    groupByColumn: string;
    onChanged: VoidFunction;
    layers: ProstglesTimeChartStateLayer[];
  };
export const ColorByLegend = ({ className, style, onChanged, ...props }: P) => {
  const {
    prgl: { db },
    groupByColumn,
    layers,
  } = props;
  const { getColor, valueStyles, oldLayerWindow } = getGroupByValueColor(props);
  const latestCols = oldLayerWindow?.$get()?.columns;
  const currCol = latestCols?.find((c) => c.name === props.groupByColumn);

  const setColumnStyle = (newStyle: ColumnConfig["style"]) => {
    if (!oldLayerWindow) return;
    const newCols = latestCols?.map((c) =>
      c.name === props.groupByColumn ?
        {
          ...c,
          style: newStyle,
        }
      : c,
    );
    updateWCols(oldLayerWindow, newCols);
    onChanged();
  };

  const { state: theme } = useReactiveState(appTheme);
  /** Add group by colors */
  useEffectDeep(() => {
    const missingLabels =
      !valueStyles ? undefined : (
        layers
          .filter(
            (l) => !valueStyles.some((s) => s.condition === l.groupByValue),
          )
          .map((l) => l.groupByValue)
      );
    if (
      (!valueStyles?.length ||
        (missingLabels?.length &&
          valueStyles.length < DefaultConditionalStyleLimit)) &&
      oldLayerWindow?.table_name
    ) {
      const parentW = props
        .getLinksAndWindows()
        .windows.find((w) => w.id === props.w.parent_window_id);
      const filter = getSmartGroupFilter(parentW?.filter || []);
      setDefaultConditionalStyle(
        {
          db,
          tableName: oldLayerWindow.table_name,
          columnName: groupByColumn,
          filter,
          theme,
        },
        (newStyle) => {
          setColumnStyle(newStyle);
        },
      );
    }
  }, [valueStyles, db, layers, oldLayerWindow?.table_name]);

  if (!valueStyles?.length) return null;
  const labels = [
    ...layers.map(
      (l) =>
        valueStyles.find((s) => s.condition === l.groupByValue) ??
        ({
          condition: l.groupByValue,
          textColor: l.color,
          operator: "=",
        } satisfies (typeof valueStyles)[number]),
    ),
    ...valueStyles
      .filter((s) => !layers.some((l) => l.groupByValue === s.condition))
      .slice(0, 3),
  ].filter(isDefined);
  const getConditionLabel = (
    condition: ColumnValue | ColumnValue[],
  ): string => {
    if (Array.isArray(condition))
      return condition.map((c) => getConditionLabel(c)).join(", ");
    if (condition === null) return "null";
    if (condition === undefined) return "undefined";
    return condition.toString();
  };

  return (
    <FlexRow
      className={classOverride("ColorByLegend", className)}
      style={style}
    >
      {labels.map((s, i) => {
        const isInData = layers.some((l) => l.groupByValue === s.condition);
        return (
          <ColorPicker
            key={i}
            style={isInData ? {} : { opacity: 0.25 }}
            value={getColor(s.condition, i)}
            label={getConditionLabel(s.condition)}
            variant="legend"
            btnProps={{ size: "micro" }}
            onChange={(newColor) => {
              const currColStyle =
                !currCol?.style || currCol.style.type !== "Conditional" ?
                  undefined
                : currCol.style;
              if (!currColStyle) return;
              setColumnStyle({
                ...currColStyle,
                conditions: currColStyle.conditions.map((c) =>
                  c.condition === s.condition ?
                    {
                      ...s,
                      textColor: newColor,
                    }
                  : c,
                ),
              });
            }}
          />
        );
      })}
    </FlexRow>
  );
};

export const getGroupByValueColor = ({
  getLinksAndWindows,
  myLinks,
  layerLinkId,
  groupByColumn,
}: Pick<
  P,
  "getLinksAndWindows" | "myLinks" | "layerLinkId" | "groupByColumn"
>) => {
  const { windows } = getLinksAndWindows();
  const thisLink = myLinks.find((l) => l.id === layerLinkId);
  const oldLayerWindow =
    !thisLink ? undefined : (
      (windows.find(
        (w) =>
          w.type === "table" && [thisLink.w1_id, thisLink.w2_id].includes(w.id),
      ) as WindowSyncItem<"table">)
    );
  const layerWindow = oldLayerWindow?.$get();
  const gbCol = oldLayerWindow
    ?.$get()
    ?.columns?.find((c) => c.name === groupByColumn);
  const style = gbCol?.style;
  const valueStyles =
    (
      style?.type === "Conditional" &&
      style.conditions.length &&
      style.conditions.every((c) => c.operator === "=")
    ) ?
      style.conditions
    : undefined;
  const getColor = (value: any, valueIndex: number) => {
    if (valueStyles) {
      const valueStyle = valueStyles.find((c) => c.condition === value);
      if (valueStyle) {
        const color =
          valueStyle.textColor || valueStyle.chipColor || valueStyle.cellColor;
        if (color) return color;
      }
    }
    return (PALETTE[`c${valueIndex}`] ?? PALETTE.c1).get();
  };

  return {
    getColor,
    valueStyles,
    layerWindow,
    oldLayerWindow,
  };
};
