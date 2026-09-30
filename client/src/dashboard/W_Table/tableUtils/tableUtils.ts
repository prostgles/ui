import type { DBSchemaTable } from "prostgles-types";
import { getKeys, pickKeys } from "prostgles-types";
import type { Prgl } from "src/App";
import type {
  DBSchemaTableWJoins,
  Join,
  JoinV2,
  WindowSyncItem,
} from "../../Dashboard/dashboardUtils";
import type {
  ColumnConfig,
  ColumnSortSQL,
  NestedColumn,
} from "@common/ColumnConfig/ColumnConfig";
import { SORTABLE_CHART_COLUMNS } from "../ColumnMenu/NestedTimechartControls";
import type { ColumnConfigWithInfo } from "@common/ColumnConfig/ColumnConfig";

/** It's a record to ensure all keys are present */
const COLUMN_CONFIG_KEYS: Record<keyof ColumnConfig, 1> = {
  idx: 1,
  computedConfig: 1,
  format: 1,
  name: 1,
  label: 1,
  display: 1,
  show: 1,
  style: 1,
  width: 1,
  nested: 1,
};
export const getMinimalColumnInfo = <
  ColumnsWithInfo extends ColumnConfigWithInfo | ColumnConfig,
>(
  columns: ColumnsWithInfo[],
): ColumnConfig[] => {
  const colconfigKeys = getKeys(COLUMN_CONFIG_KEYS);
  return columns.map((c) => {
    const columnCoreInfo = pickKeys(c, colconfigKeys, true);
    if (!columnCoreInfo.nested) {
      return columnCoreInfo;
    }
    return {
      ...columnCoreInfo,
      nested: {
        ...columnCoreInfo.nested,
        columns: getMinimalColumnInfo(columnCoreInfo.nested.columns),
      },
    };
  });
};

export const updateWCols = (
  w: WindowSyncItem<"table">,
  newCols: WindowSyncItem<"table">["columns"] = null,
  nestedColumnName?: string,
) => {
  const newMinimalCols = newCols && getMinimalColumnInfo(newCols);
  if (nestedColumnName) {
    const currCols = w.$get()?.columns;
    if (!currCols) {
      console.error("No w cols");
      return;
    }
    if (!newMinimalCols) {
      console.error("No newMinimalCols");
      return;
    }
    return w.$update({
      columns: currCols.map((c) => {
        if (c.name === nestedColumnName) {
          if (!c.nested) {
            throw "nestedColumnName not pointing to a nested column";
          }
          /** Prevent hiding all nested cols */
          // const noColsSelected = !newMinimalCols.some(nc => nc.show)
          return {
            ...c,
            nested: {
              ...c.nested,
              columns: newMinimalCols.map((c) => {
                if (c.nested) {
                  throw "Nested columns within nested columns are not supported";
                }
                return c as NestedColumn<ColumnConfig>;
              }),
            },
          };
        }
        return c;
      }),
    });
  }

  return w.$update({
    // sort: [],
    columns: newMinimalCols,
  });
};

export const getSortColumn = <
  C extends Pick<ColumnConfig, "name" | "idx" | "nested">,
>(
  sort: ColumnSortSQL,
  columns: C[],
): C | undefined => {
  return columns.find((c) => {
    return (
      c.name === sort.key ||
      (typeof sort.key === "number" &&
        typeof c.name === "string" &&
        c.idx === sort.key) ||
      (c.nested?.display?.type === "timechart" &&
        SORTABLE_CHART_COLUMNS.some(
          (sortCol) => sort.key === `${c.name}.${sortCol}`,
        )) ||
      c.nested?.columns.some((nc) => sort.key === `${c.name}.${nc.name}`)
    );
  });
};

export const getSort = (
  tables: DBSchemaTableWJoins[],
  w: Pick<WindowSyncItem<"table">, "sort" | "columns" | "table_name">,
): ColumnSortSQL[] => {
  const table = tables.find((t) => t.name === w.table_name);
  const sort = !w.columns && !w.sort?.length ? table?.sort : w.sort;

  if (!sort) return [];

  let _sort: ColumnSortSQL[] = sort.map((s) => ({ ...s }));

  const cols = table?.columns;
  if (!cols) return [];

  const windowColumns = w.columns;
  _sort = _sort.filter((s) => {
    if (!windowColumns) {
      /** Sort key must match a valid table column */
      return cols.some((c) => c.name === s.key);
    } else {
      const windowColumn = getSortColumn(s, windowColumns);
      if (windowColumn?.nested) {
        return true;
      }
      return cols.some((c) => {
        if (windowColumn?.computedConfig) {
          /** CountAll doesn't require a column */
          return (
            !windowColumn.computedConfig.column ||
            windowColumn.computedConfig.column === c.name
          );
        } else if (windowColumn) {
          return windowColumn.name === c.name;
        }
      });
    }
  });

  return _sort;
};

export const getJoinedTables = (
  tables: DBSchemaTable[],
  tableName: string,
  db: Prgl["db"],
): { joins: Join[]; joinsV2: JoinV2[] } => {
  const myCols = tables.find((t) => t.name === tableName)?.columns;
  const upsertJoin = (joins: Join[], upsertedJoin: Join) => {
    /** Do not show join if the table is not available to user */
    if (!db[upsertedJoin.tableName]) return;

    let found = false;

    /** Joined tables are not duplicated?!! */
    joins.forEach((join) => {
      if (join.tableName === upsertedJoin.tableName) {
        found = true;
        join.on = [...join.on, ...upsertedJoin.on];
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!found) {
      joins.push(upsertedJoin);
    }
  };

  const joinsV2: JoinV2[] = [];
  const upsertJoinV2 = (tableName: string, condition: [string, string][]) => {
    /** Do not show join if the table is not available to user */
    if (!db[tableName]) return;

    const tableJoinIdx = joinsV2.findIndex((j) => j.tableName === tableName);
    if (tableJoinIdx > -1) {
      const onIdx = joinsV2[tableJoinIdx]!.on.findIndex((cond) =>
        cond.every((cols) =>
          condition.some((newCols) => cols.join() === newCols.join()),
        ),
      );
      if (onIdx < 0) {
        joinsV2[tableJoinIdx]!.on.push(condition);
      }
    } else {
      joinsV2.push({
        tableName,
        on: [condition],
      });
    }
  };

  const myReferencedJoins: ReturnType<typeof getJoinedTables> = {
    joins: [],
    joinsV2: [],
  };
  myCols
    ?.filter((c) => c.references)
    .forEach((c) => {
      c.references?.forEach(({ ftable, cols, fcols }) => {
        upsertJoin(myReferencedJoins.joins, {
          tableName: ftable,
          on: cols.map((c, i) => [c, fcols[i]!]),
        });
        upsertJoinV2(
          ftable,
          cols.map((c, idx) => [c, fcols[idx]!]),
        );
      });
    });
  const myReferees: ReturnType<typeof getJoinedTables> = {
    joins: [],
    joinsV2: [],
  };
  tables
    .filter((t) => t.name !== tableName)
    .forEach(({ name, columns }) => {
      columns.forEach((c) => {
        const matchingReferences = c.references?.filter(
          ({ ftable }) => ftable === tableName,
        );
        if (matchingReferences?.length) {
          matchingReferences.forEach(({ fcols, cols }) => {
            upsertJoin(myReferees.joins, {
              tableName: name,
              hasFkeys: true,
              on: [[fcols[0]!, c.name]],
            });
            upsertJoinV2(
              name,
              fcols.map((c, idx) => [c, cols[idx]!]),
            );
          });
        }
      });
    });

  return {
    joins: [...myReferencedJoins.joins, ...myReferees.joins],
    joinsV2,
  };
};
