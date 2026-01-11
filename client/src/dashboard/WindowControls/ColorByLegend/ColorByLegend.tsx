import {
  getSmartGroupFilter,
  getTableFilterFromDetailedGroupFilter,
} from "@common/filterUtils";
import type { DivProps } from "@components/Flex";
import { FlexRow, classOverride } from "@components/Flex";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { useEffectDeep } from "prostgles-client/dist/prostgles";
import React, { useCallback, useMemo } from "react";
import { chipColors } from "src/dashboard/W_Table/ColumnMenu/ColumnDisplayFormat/ChipStylePalette";
import {
  DefaultConditionalStyleLimit,
  fetchColumnValues,
} from "src/dashboard/W_Table/ColumnMenu/ColumnStyleControls/getValueColors";
import { isDefined } from "../../../utils/utils";
import type { CommonWindowProps } from "../../Dashboard/Dashboard";
import { ColorPicker } from "../../W_Table/ColumnMenu/ColorPicker";
import {
  getRandomElement,
  type ColumnValue,
} from "../../W_Table/ColumnMenu/ColumnStyleControls/ColumnStyleControls";
import type { W_TimeChartStateLayer } from "../../W_TimeChart/W_TimeChart";
import { getGroupByValueColor } from "./getGroupByValueColor";

type P = DivProps &
  Pick<CommonWindowProps, "getLinksAndWindows" | "myLinks" | "w"> & {
    layerLinkId: string;
    groupByColumn: string;
    onChanged: VoidFunction;
    layers: W_TimeChartStateLayer[];
  };
export const ColorByLegend = ({ className, style, onChanged, ...props }: P) => {
  const { groupByColumn, layers } = props;
  const { db, theme } = usePrgl();
  const {
    getColor,
    oldLayerWindow,
    thisLink,
    valueStyles,
    thisLinkTimechartOptions,
  } = getGroupByValueColor(props);

  const layerGroupByValues = useMemo(
    () => Array.from(new Set(layers.map((l) => l.groupByValue))),
    [layers],
  );

  const linkOptions = thisLinkTimechartOptions;
  const { dataSource } = linkOptions ?? {};
  const tableName =
    dataSource?.type === "local-table" ? dataSource.localTableName
    : dataSource?.type === "table" ? dataSource.tableName
    : oldLayerWindow?.table_name;
  const smartGroupFilter =
    dataSource?.type === "local-table" ?
      dataSource.smartGroupFilter
    : undefined;
  const groupByColumnColors = linkOptions?.groupByColumnColors;

  const updateGroupByColumnColors = useCallback(
    (groupByColumnColors: { value: unknown; color: string }[]) => {
      if (!thisLink || !linkOptions) throw "Not expected";
      thisLink.$update({
        options: {
          ...linkOptions,
          groupByColumnColors,
        },
      });
      onChanged();
    },
    [thisLink, linkOptions, onChanged],
  );

  /** Add group by colors */
  useEffectDeep(() => {
    const missingLabels =
      !valueStyles ? undefined : (
        layerGroupByValues.filter(
          (groupByValue) => !valueStyles.some((s) => s.value === groupByValue),
        )
      );
    if (
      !valueStyles?.length ||
      (missingLabels?.length &&
        valueStyles.length < DefaultConditionalStyleLimit)
    ) {
      const parentW = props
        .getLinksAndWindows()
        .windows.find((w) => w.id === props.w.parent_window_id);
      const filter =
        smartGroupFilter ?
          getTableFilterFromDetailedGroupFilter(smartGroupFilter)
        : getSmartGroupFilter(parentW?.filter || []);
      void fetchColumnValues(
        linkOptions?.dataSource?.type === "sql" ?
          {
            type: "sql",
            db,
            query: linkOptions.dataSource.sql,
            columnName: groupByColumn,
            theme,
          }
        : {
            type: "table",
            db,
            tableName: tableName!,
            columnName: groupByColumn,
            filter,
            theme,
          },
      ).then((values) => {
        if (!values) return;
        const prevSyleIndexes = new Set<number>();
        updateGroupByColumnColors(
          values.map((value) => {
            const nonPickedStyles =
              prevSyleIndexes.size === chipColors.length ?
                chipColors
              : chipColors.filter((_, i) => !prevSyleIndexes.has(i));
            const { elem: style, index } = getRandomElement(nonPickedStyles);
            prevSyleIndexes.add(index);
            return {
              color: style.color,
              value,
            };
          }),
        );
      });
    }
  }, [
    db,
    groupByColumn,
    layerGroupByValues,
    linkOptions,
    props,
    smartGroupFilter,
    tableName,
    theme,
    updateGroupByColumnColors,
    valueStyles,
  ]);

  if (!valueStyles?.length) return null;
  const labels = [
    ...layers.map(
      (l) =>
        valueStyles.find((s) => s.value === l.groupByValue) ??
        ({
          value: l.groupByValue,
          color: l.color,
        } satisfies (typeof valueStyles)[number]),
    ),
    ...valueStyles
      .filter((s) => !layers.some((l) => l.groupByValue === s.value))
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
        const isInData = layers.some((l) => l.groupByValue === s.value);
        return (
          <ColorPicker
            key={i}
            style={isInData ? {} : { opacity: 0.25 }}
            value={getColor(s.value, i)}
            label={getConditionLabel(s.value)}
            variant="legend"
            btnProps={{ size: "micro" }}
            onChange={(newColor) => {
              const newGroupByColumnColors =
                groupByColumnColors?.map((c) => {
                  return c.value === s.value ?
                      {
                        value: c.value,
                        color: newColor,
                      }
                    : c;
                }) ?? [];
              if (!newGroupByColumnColors.some((c) => c.value === s.value)) {
                newGroupByColumnColors.push({
                  ...s,
                  color: newColor,
                });
              }
              updateGroupByColumnColors(newGroupByColumnColors);
            }}
          />
        );
      })}
    </FlexRow>
  );
};
