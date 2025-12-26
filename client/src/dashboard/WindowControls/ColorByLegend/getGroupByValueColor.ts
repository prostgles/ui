import { getProperty } from "@common/utils";
import { includes } from "prostgles-types";
import type { CommonWindowProps } from "src/dashboard/Dashboard/Dashboard";
import type { WindowSyncItem } from "../../Dashboard/dashboardUtils";
import { PALETTE } from "../../Dashboard/PALETTE";

export const getGroupByValueColor = ({
  getLinksAndWindows,
  myLinks,
  layerLinkId,
}: Pick<CommonWindowProps, "getLinksAndWindows" | "myLinks"> & {
  layerLinkId: string;
  groupByColumn: string;
}) => {
  const { windows } = getLinksAndWindows();
  const thisLink = myLinks.find((l) => l.id === layerLinkId);
  const thisLinkTimechartOptions =
    thisLink?.options.type === "timechart" ? thisLink.options : undefined;
  const valueStyles =
    thisLinkTimechartOptions?.type === "timechart" ?
      thisLinkTimechartOptions.groupByColumnColors
    : undefined;
  const oldLayerWindow =
    !thisLink ? undefined : (
      (windows.find(
        (w) =>
          includes(["sql", "table"], w.type) &&
          [thisLink.w1_id, thisLink.w2_id].includes(w.id),
      ) as WindowSyncItem<"table"> | WindowSyncItem<"sql">)
    );
  const layerWindow = oldLayerWindow?.$get();

  const getColor = (value: unknown, valueIndex: number) => {
    const valueStyle = valueStyles?.find((c) => c.value === value);
    if (valueStyle) {
      return valueStyle.color;
    }
    const c = getProperty(PALETTE, `c${valueIndex}`);
    return (c ?? PALETTE.c1).getStr();
  };

  return {
    getColor,
    valueStyles,
    layerWindow,
    oldLayerWindow,
    thisLink,
    thisLinkTimechartOptions,
  };
};
