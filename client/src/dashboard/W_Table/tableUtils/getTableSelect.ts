import {
  getSmartGroupFilter,
  getTableFilterFromDetailedGroupFilter,
} from "@common/filterUtils";
import type { AnyObject, Select, SelectFunction } from "prostgles-types";
import { isDefined } from "prostgles-types";
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
import { getFormatColumnSelect } from "../ColumnMenu/ColumnDisplayFormat/getFormatColumnSelect";
import { getTableIdentityColumns } from "../ColumnMenu/ColumnDisplayFormat/getTableIdentityColumns";
import { getParentTableJoinColumnNames } from "../ColumnMenu/ColumnDisplayFormat/getLinkedRecordsFilter";
import type { ColumnConfig } from "../ColumnMenu/ColumnMenu";
import type { ColumnConfigWithInfo, MinMax } from "../W_Table";
import {
  fetchChartRangeValues,
  type ChartValues,
} from "./fetchChartRangeValues";
import { getColumnsWithInfoAndWidth } from "./getColumnsWithInfoAndWidth";

export const getTableSelect = async (
  w: Pick<WindowData<"table">, "columns" | "table_name">,
  tables: DBSchemaTableWJoins[],
  db: Prgl["db"],
  filter: AnyObject,
  withoutData = false,
): Promise<{ barchartVals?: ChartValues; select: AnyObject }> => {
  const select: AnyObject = {};

  const barchartVals: ChartValues = new Map();
  const fullColumns = getColumnsWithInfoAndWidth(tables, w);
  const table = tables.find((t) => t.name === w.table_name);
  if (!table) throw "Table not found";

  await Promise.all(
    fullColumns.map(async (c) => {
      if (!c.show) {
        return;
      }

      if (c.computedConfig) {
        select[c.name] = getComputedColumnSelect(c.computedConfig);
      } else if (c.nested) {
        const nestedSel = await getNestedColumnSelect(
          { ...c, nested: c.nested },
          db,
          tables,
          withoutData,
        );
        if (nestedSel) {
          if (nestedSel.dateExtent) {
            /**
             * TODO: consolidate date/chart min max handling.
             * ensure ALL nested ChartValues are fetched either in fetchChartRangeValues
             * or in getNestedColumnSelect
             */
            barchartVals.set(c.name, {
              type: "date",
              range: {
                min: +nestedSel.dateExtent.min,
                max: +nestedSel.dateExtent.max,
              },
            });
          }
          select[c.name] = nestedSel.select;
        }
      } else {
        select[c.name] = 1;
      }
    }),
  );

  Object.assign(select, getRequiredTableSelect(fullColumns, table));

  await Promise.all(
    fullColumns.map(async (c) => {
      const { findOne } = db[w.table_name] ?? {};
      if (!findOne) {
        return;
      }
      const chartValues = await fetchChartRangeValues({
        findOne,
        column: c,
        select,
        filter,
        withoutData,
      });
      if (chartValues) barchartVals.set(c.name, chartValues);
    }),
  );

  return { barchartVals, select };
};

export const getRequiredTableSelect = (
  columns: ColumnConfigWithInfo[],
  table: DBSchemaTableWJoins,
): Select => {
  const select: AnyObject = {};
  const shownColumns = columns.filter((column) => column.show);
  const selectableColumnNames = new Set(
    table.columns
      .filter((column) => column.select)
      .map((column) => column.name),
  );
  const addColumn = (columnName: string | undefined) => {
    if (columnName && selectableColumnNames.has(columnName)) {
      select[columnName] ??= 1;
    }
  };

  shownColumns.forEach((column) => {
    if (!column.computedConfig && !column.nested) {
      Object.assign(select, getFormatColumnSelect({ column, table }));
      addColumn(
        column.style?.type === "Conditional" ? column.style.column : undefined,
      );
    }
    getParentTableJoinColumnNames(column).forEach(addColumn);
  });

  const hasAggregate = shownColumns.some(
    (column) => column.computedConfig?.funcDef.isAggregate,
  );
  if (
    !hasAggregate &&
    shownColumns.some((column) => column.action?.type === "record")
  ) {
    getTableIdentityColumns(table).forEach(({ name }) => addColumn(name));
  }

  return select;
};

export const getComputedColumnSelect = (
  computedConfig: Required<ColumnConfig>["computedConfig"],
): SelectFunction => {
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
  const aggregateOptions =
    computedConfig.funcDef.isAggregate ?
      computedConfig.aggregateOptions
    : undefined;
  const aggregateFilter =
    aggregateOptions?.filter &&
    getTableFilterFromDetailedGroupFilter(aggregateOptions.filter);
  return {
    [funcName]: functionArgs,
    ...(!isEmpty(aggregateFilter) && { $filter: aggregateFilter }),
    ...(aggregateOptions?.orderBy && {
      $orderBy: aggregateOptions.orderBy,
    }),
  } as SelectFunction;
};

const getNestedColumnSelect = async (
  parentColumn: Pick<Required<ColumnConfig>, "nested"> &
    Pick<ColumnConfig, "style" | "width">,
  db: Prgl["db"],
  tables: DBSchemaTableWJoins[],
  withoutData = false,
): Promise<{ select: AnyObject; dateExtent?: MinMax<Date> } | undefined> => {
  let nestedSelect: AnyObject = {};
  let dateExtent: MinMax<Date> | undefined;
  const display = parentColumn.nested.display;

  const nestedTable = tables.find(
    (table) => table.name === parentColumn.nested.path.at(-1)?.table,
  );
  if (!nestedTable) throw "Nested table not found";

  if (display?.type === "timechart") {
    const targetTableHandler = db[nestedTable.name]!;
    dateExtent =
      withoutData ?
        { min: new Date(), max: new Date() }
      : await getTimeChartMinMax(targetTableHandler, {}, display.dateCol);

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
          width: parentColumn.width ?? 100,
        });
    nestedSelect = getTimeChartSelectParams({
      bin,
      dateColumn: display.dateCol,
      groupByColumn: undefined,
      statType:
        !display.yAxis.isCountAll ?
          {
            funcName: display.yAxis.funcName,
            numericColumn: display.yAxis.colName,
          }
        : undefined,
    }).select;
  } else {
    nestedSelect = (
      await getTableSelect(
        { columns: parentColumn.nested.columns, table_name: nestedTable.name },
        tables,
        db,
        {},
        true, // Only build the select; ranges depend on the parent query.
      )
    ).select;
    if (display?.type === "entities") {
      getTableIdentityColumns(nestedTable).forEach((column) => {
        nestedSelect[column.name] ??= 1;
      });
    }
  }

  const conditionColumn =
    parentColumn.style?.type === "Conditional" && parentColumn.style.column;
  if (
    display?.type === "entities" &&
    conditionColumn &&
    nestedTable.columns.some(
      (column) => column.name === conditionColumn && column.select,
    )
  ) {
    nestedSelect[conditionColumn] ??= 1;
  }
  if (isEmpty(nestedSelect)) return undefined;

  const limit =
    display?.type === "entities" && parentColumn.nested.limit !== undefined ?
      parentColumn.nested.limit + 1
    : parentColumn.nested.limit;

  const filter = getSmartGroupFilter(
    parentColumn.nested.detailedFilter,
    undefined,
    "and",
  );
  const having = getSmartGroupFilter(
    parentColumn.nested.detailedHaving,
    undefined,
    "and",
  );
  return {
    dateExtent,
    select: {
      [parentColumn.nested.joinType === "inner" ? "$innerJoin" : "$leftJoin"]:
        parentColumn.nested.path,
      limit,
      select: nestedSelect,
      orderBy: parentColumn.nested.sort && [parentColumn.nested.sort],
      filter,
      having,
    },
  };
};
