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
  let statField: any = { $countAll: [] };
  if (statType) {
    const stat = TIMECHART_STAT_TYPES.find((s) => s.func === statType.funcName);
    if (stat) {
      statField = { [stat.func]: [statType.numericColumn] };
    }
  }

  const select = {
    [TIMECHART_FIELD_NAMES.value]: statField,
    ...(groupByColumn && { [groupByColumn]: 1 }),
    [TIMECHART_FIELD_NAMES.date]: getTimeChartSelectDate({ bin, dateColumn }),
  };

  return {
    select,
    orderBy: { [TIMECHART_FIELD_NAMES.date]: 1 },
  } as const;
};
