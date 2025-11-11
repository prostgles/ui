import type { WindowData } from "src/dashboard/Dashboard/dashboardUtils";
import type { ProstglesTimeChartLayer } from "../W_TimeChart";
import { omitKeys } from "prostgles-types";

export const getTimeLayerDataSignature = (
  l: ProstglesTimeChartLayer,
  w: WindowData<"timechart">,
  dependencies: any[],
) => {
  if (l.type === "table") {
    return JSON.stringify({
      ...omitKeys(l, ["updateOptions"]),
      wopts: w.options,
      dependencies,
    });
  } else {
    return JSON.stringify({
      ...omitKeys(l, ["updateOptions"]),
      wopts: w.options,
      dependencies,
    });
  }
};
