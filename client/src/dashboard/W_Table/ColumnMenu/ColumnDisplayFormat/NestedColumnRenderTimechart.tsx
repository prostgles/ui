import { omitKeys } from "prostgles-types";
import React, { useMemo } from "react";
import {
  TimeChart,
  type TimeChartLayer,
} from "../../../Charts/TimeChart/TimeChart";
import { getYLabelFunc } from "../../../W_TimeChart/fetchData/getTimeChartData";
import type { ColumnConfigChart } from "../ColumnConfig";
import type { NestedColumnRenderProps } from "./NestedColumnRender";
import Loading from "@components/Loader/Loading";

export const NestedColumnRenderTimechart = ({
  columnName,
  row,
  nestedTimeChartMeta,
  chart,
}: Pick<NestedColumnRenderProps, "row" | "nestedTimeChartMeta"> & {
  columnName: string;
  chart: ColumnConfigChart;
}): JSX.Element => {
  const value = row[columnName] as TimeChartLayer["data"] | undefined;
  const layers = useMemo(() => {
    return (
      nestedTimeChartMeta &&
      value &&
      ([
        {
          label: `${Object.entries(omitKeys(row, [columnName])).map(([key, val]) => `${key}: ${JSON.stringify(val)}`)}`,
          getYLabel: getYLabelFunc(""),
          color: "rgb(0, 183, 255)",
          cols: [],
          data: value,
          variant: chart.renderStyle === "smooth-line" ? "smooth" : undefined,
          ...nestedTimeChartMeta,
        },
      ] satisfies TimeChartLayer[])
    );
  }, [nestedTimeChartMeta, row, columnName, value, chart.renderStyle]);

  if (!layers?.length) return <Loading />;

  return (
    <TimeChart
      binSize={undefined}
      showXAxis={false}
      yAxisVariant="compact"
      className="bg-transparent"
      padding={{
        top: 10,
        bottom: 10,
      }}
      zoomPanDisabled={true}
      renderStyle={
        chart.renderStyle === "smooth-line" ? undefined : chart.renderStyle
      }
      layers={layers}
    />
  );
};
