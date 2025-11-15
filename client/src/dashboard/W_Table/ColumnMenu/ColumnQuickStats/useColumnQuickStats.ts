import { getSmartGroupFilter } from "@common/filterUtils";
import { usePromise } from "prostgles-client/dist/prostgles";
import {
  _PG_numbers,
  includes,
  isDefined,
  type AnyObject,
} from "prostgles-types";
import type { ColumnQuickStatsProps } from "./ColumnQuickStats";

export const useColumnStats = (
  { column, db, w }: ColumnQuickStatsProps,
  sortAscending: boolean,
) => {
  const { name, udt_name } = column;
  const {
    table_name: tableName,
    filter,
    options: { filterOperand = "AND" },
  } = w;

  const res = usePromise(async () => {
    const tableFindHandler = db[tableName]?.find;
    const tableFindOneHandler = db[tableName]?.findOne;
    const tableCountHandler = db[tableName]?.count;

    const finalFilter =
      filter.length ?
        getSmartGroupFilter(
          filter,
          {},
          filterOperand === "OR" ? "or" : undefined,
        )
      : undefined;
    if (!tableFindHandler || !tableFindOneHandler || !tableCountHandler) {
      return {
        type: "error" as const,
        error: `Table ${tableName} not found in DB handler`,
      };
    }

    const distinctCount = await tableCountHandler(finalFilter, {
      select: [name],
      groupBy: true,
    });
    const minMax = await tableFindOneHandler(finalFilter, {
      select: { min: { $min: [name] }, max: { $max: [name] } },
    });

    let distribution:
      | {
          label: string;
          count: number;
          onClick?: () => void;
        }[]
      | undefined = undefined;
    let canSortDistribution = false;

    if (minMax && minMax.min !== minMax.max) {
      if (udt_name === "date" || udt_name.startsWith("timestamp")) {
        const intervals: { label: string; filters: AnyObject[] }[] = [];
        const minDate = new Date(minMax.min);
        const maxDate = new Date(minMax.max);
        const intervalCount = Math.min(5, distinctCount);
        const totalMs = maxDate.getTime() - minDate.getTime();
        const intervalMs = totalMs / intervalCount;

        for (let i = 0; i < intervalCount; i++) {
          const start = new Date(minDate.getTime() + i * intervalMs);
          const end = new Date(minDate.getTime() + (i + 1) * intervalMs);
          intervals.push({
            label: `${start.toISOString().split("T")[0]} - ${end.toISOString().split("T")[0]}`,
            filters: [
              {
                [name]: {
                  $gte: start.toISOString(),
                },
                [name]: {
                  $lt: end.toISOString(),
                },
              },
            ],
          });
        }

        distribution ??= [];
        for (const interval of intervals) {
          const count = await tableCountHandler({
            $and: [finalFilter, ...interval.filters].filter(isDefined),
          });
          distribution.push({ label: interval.label, count });
        }
      } else if (includes(_PG_numbers, udt_name)) {
        const intervals: { label: string; filters: AnyObject[] }[] = [];
        const minNum = Number(minMax.min);
        const maxNum = Number(minMax.max);
        const totalRange = maxNum - minNum;
        const intervalCount = Math.min(5, distinctCount);
        const intervalRange = totalRange / intervalCount;

        for (let i = 0; i < intervalCount; i++) {
          const start = minNum + i * intervalRange;
          const end = minNum + (i + 1) * intervalRange;
          intervals.push({
            label: `${start.toFixed(2)} - ${end.toFixed(2)}`,
            filters: [
              {
                [name]: {
                  $gte: start,
                },
                [name]: {
                  $lt: end,
                },
              },
            ],
          });
        }

        distribution ??= [];
        for (const interval of intervals) {
          const count = await tableCountHandler({
            $and: [finalFilter, ...interval.filters].filter(isDefined),
          });
          distribution.push({ label: interval.label, count });
        }
      } else if (udt_name.startsWith("geo")) {
        // No min max
      } else {
        canSortDistribution = true;

        const topValues = await tableFindHandler(finalFilter, {
          select: {
            label: { $column: [name] },
            count: { $countAll: [] },
          },
          orderBy: [{ key: "count", asc: sortAscending, nulls: "last" }],
          limit: Math.min(distinctCount, 15),
        });
        distribution = topValues.map((v) => ({
          label: v.label?.toString() ?? "NULL",
          count: v.count,
          onClick: () => {
            w.$update({
              filter: [
                ...w.filter,
                {
                  fieldName: name,
                  type: "$in",
                  value: [v.label],
                  minimised: true,
                },
              ],
            });
          },
        }));
      }
    }

    return {
      type: "success" as const,
      distinctCount,
      minMax,
      distribution,
      canSortDistribution,
    };
  }, [db, tableName, filter, filterOperand, name, udt_name, sortAscending, w]);

  return res;
};
