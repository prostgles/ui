import type { WindowData } from "@common/ColumnConfig/WindowData";
import type { ProstglesTimeChartLayer } from "../W_TimeChart";

export const getTimeLayerDataSignature = (
  l: ProstglesTimeChartLayer,
  w: WindowData<"timechart">,
  dependencies: any[],
) => {
  if (l.type === "table") {
    return JSON.stringify({
      ...l,
      wopts: w.options,
      dependencies,
    });
  } else {
    return JSON.stringify({
      ...l,
      wopts: w.options,
      dependencies,
    });
  }
};
