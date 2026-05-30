import { getSmartGroupFilter } from "@common/filterUtils";
import type { AnyObject } from "prostgles-types";
import { isDefined, reverseParsedPath } from "prostgles-types";
import type { Prgl } from "src/App";
import { isEmpty } from "../../../utils/utils";
import type {
  DBSchemaTableWJoins,
  WindowData,
} from "../../Dashboard/dashboardUtils";
import {
  getDesiredTimeChartBinSize,
  getTimeChartMinMax,
} from "../../W_TimeChart/fetchData/getTimeChartLayersWithBins";
import { getTimeChartSelectParams } from "../../W_TimeChart/fetchData/getTimeChartSelectParams";
import type { ColumnConfig } from "../ColumnMenu/ColumnMenu";
import type { MinMax, MinMaxVals } from "../W_Table";
import { getFullColumnConfig } from "./getFullColumnConfig";
import { getSingleShownNestedColumn } from "./StyledTableColumn";

export const getTableSelect = async (
  w: Pick<WindowData<"table">, "columns" | "table_name">,
  tables: DBSchemaTableWJoins[],
  db: Prgl["db"],
  filter: AnyObject,
  withoutData = false,
): Promise<{ barchartVals?: AnyObject; select: AnyObject }> => {
  const select: AnyObject = {};

  let barchartVals: MinMaxVals | undefined;

  if (!w.columns || !Array.isArray(w.columns)) {
    return { barchartVals, select: { "*": 1 } };
  }

  const fullColumns = getFullColumnConfig(tables, w);
  await Promise.all(
    fullColumns.map(async (c) => {
      if (!c.show) {
        return;
      }

      if (c.computedConfig) {
        select[c.name] = getComputedColumnSelect(c.computedConfig);
      } else if (c.nested) {
        const nestedSel = await getNestedColumnSelect(
          c,
          db,
          tables,
          withoutData,
        );
        if (nestedSel) {
          if (nestedSel.dateExtent) {
            barchartVals ??= {};
            barchartVals[c.name] = nestedSel.dateExtent as any;
          }
          select[c.name] = nestedSel.select;
        }
      } else {
        select[c.name] = 1;
      }
    }),
  );

  await Promise.all(
    fullColumns.map(async (c) => {
      if (
        !c.show ||
        !(c.style && ["Barchart", "Scale"].includes(c.style.type))
      ) {
        return;
      }
      barchartVals ??= {};
      let minMax:
        | {
            min: any;
            max: any;
          }
        | undefined;
      let isDate = false;

      if (withoutData) {
        minMax = { min: -1, max: -1 };
      } else if (c.computedConfig || c.nested) {
        const sortByKey =
          c.computedConfig ?
            c.name
          : `${c.name}.${getSingleShownNestedColumn(c, tables)?.shownCol.name}`;
        const minRow = await db[w.table_name]?.findOne?.(filter, {
          select,
          orderBy: [{ key: sortByKey, asc: true, nulls: "last" }],
        });
        const maxRow = await db[w.table_name]?.findOne?.(filter, {
          select,
          orderBy: [{ key: sortByKey, asc: false, nulls: "last" }],
        });

        const min =
          c.computedConfig ?
            minRow?.[c.name]
          : minRow?.[c.name]?.[0]?.[
              getSingleShownNestedColumn(c, tables)?.shownCol.name ?? ""
            ];
        const max =
          c.computedConfig ?
            maxRow?.[c.name]
          : maxRow?.[c.name]?.[0]?.[
              getSingleShownNestedColumn(c, tables)?.shownCol.name ?? ""
            ];
        minMax = {
          min,
          max,
        };
      } else {
        minMax = await db[w.table_name]?.findOne?.(filter, {
          select: {
            min: { $min: [c.name] },
            max: { $max: [c.name] },
          },
        });

        isDate =
          c.info?.udt_name.startsWith("timestamp") ||
          c.info?.udt_name === "date";
      }
      if (minMax) {
        barchartVals[c.name] = {
          min: isDate ? +new Date(minMax.min) : +minMax.min,
          max: isDate ? +new Date(minMax.max) : +minMax.max,
        };
      }
    }),
  );

  return { barchartVals, select };
};

export const getComputedColumnSelect = (
  computedConfig: Required<ColumnConfig>["computedConfig"],
) => {
  let funcName = computedConfig.funcDef.key;
  let functionArgs: any[] = [computedConfig.column].filter(isDefined);
  if (computedConfig.column || computedConfig.args) {
    const { args } = computedConfig;
    if (args?.$duration?.otherColumn) {
      functionArgs = [computedConfig.column, args.$duration.otherColumn];
      funcName = "$age";
    } else if (funcName === "$string_agg") {
      functionArgs = [
        computedConfig.column,
        args?.$string_agg?.separator || ", ",
      ];
    } else if (args?.$template_string) {
      functionArgs = [args.$template_string];
    }
  }
  return { [funcName]: functionArgs };
};

export const getNestedColumnSelect = async (
  c: ColumnConfig,
  db: Prgl["db"],
  tables: DBSchemaTableWJoins[],
  withoutData = false,
): Promise<{ select: AnyObject; dateExtent?: MinMax<Date> } | undefined> => {
  if (!c.nested) throw "Impossible";

  let nestedSelect: AnyObject = {};
  let dateExtent: MinMax<Date> | undefined;
  if (c.nested.chart) {
    const targetTable = c.nested.path.at(-1)!.table;
    const targetTableHandler = db[targetTable]!;
    dateExtent =
      withoutData ?
        { min: new Date(), max: new Date() }
      : await getTimeChartMinMax(
          targetTableHandler,
          {},
          c.nested.chart.dateCol,
        );

    const { bin } =
      withoutData ?
        { bin: "day" as const }
      : getDesiredTimeChartBinSize({
          dataExtent: {
            minDate: dateExtent.min,
            maxDate: dateExtent.max,
          },
          manualBinSize: undefined,
          pxPerPoint: 5,
          viewPortExtent: undefined,
          width: c.width ?? 100,
        });
    nestedSelect = getTimeChartSelectParams({
      bin,
      dateColumn: c.nested.chart.dateCol,
      groupByColumn: undefined,
      statType:
        !c.nested.chart.yAxis.isCountAll ?
          {
            funcName: c.nested.chart.yAxis.funcName,
            numericColumn: c.nested.chart.yAxis.colName,
          }
        : undefined,
    }).select;
  } else {
    nestedSelect = (
      await getTableSelect(
        { columns: c.nested.columns, table_name: c.nested.path.at(-1)!.table },
        tables,
        db,
        {},
        withoutData,
      )
    ).select;
    if (isEmpty(nestedSelect)) {
      return undefined;
    }
  }

  const filter = getSmartGroupFilter(c.nested.detailedFilter, undefined, "and");
  const having = getSmartGroupFilter(c.nested.detailedHaving, undefined, "and");
  return {
    dateExtent,
    select: {
      [c.nested.joinType === "inner" ? "$innerJoin" : "$leftJoin"]:
        c.nested.path,
      limit: c.nested.limit,
      select: nestedSelect,
      orderBy: c.nested.sort && [c.nested.sort],
      filter,
      having,
    },
  };
};
