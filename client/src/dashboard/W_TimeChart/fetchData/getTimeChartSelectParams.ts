import type { ProstglesTimeChartLayer } from "../W_TimeChart";
import { TIMECHART_STAT_TYPES } from "../W_TimeChartMenu";
import { TIMECHART_FIELD_NAMES } from "./constants";
import type { FetchedLayerData } from "./getTimeChartData";

export const getTimeChartSelectDate = ({
  dateColumn,
  bin,
}: Pick<GetTimeChartSelectArgs, "bin" | "dateColumn">) => {
  return { ["$date_trunc_" + bin]: [dateColumn, { timeZone: true }] };
};

export type GetTimeChartSelectArgs = Pick<
  ProstglesTimeChartLayer,
  "statType" | "groupByColumn" | "dateColumn"
> & {
  bin: FetchedLayerData["binSize"];
};
export const getTimeChartSelectParams = ({
  statType,
  groupByColumn,
  dateColumn,
  bin,
}: GetTimeChartSelectArgs) => {
  const stat =
    statType && TIMECHART_STAT_TYPES.find((s) => s.func === statType.funcName);
  const valueSelect =
    stat ? { [stat.func]: [statType.numericColumn] } : { $countAll: [] };
  const select = {
    [TIMECHART_FIELD_NAMES.value]: valueSelect,
    ...(groupByColumn && { [groupByColumn]: 1 }),
    [TIMECHART_FIELD_NAMES.date]: getTimeChartSelectDate({ bin, dateColumn }),
  };

  return {
    select,
    orderBy: { [TIMECHART_FIELD_NAMES.date]: 1 },
  } as const;
};
