import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { AnyObject, DBSchemaTable } from "prostgles-types";
import { getKeys } from "prostgles-types";
import { pickKeys } from "prostgles-types";
import type { CommonWindowProps } from "../../Dashboard/Dashboard";
import type {
  Join,
  JoinV2,
  WindowData,
  WindowSyncItem,
} from "../../Dashboard/dashboardUtils";
import type { ColumnConfig, ColumnSort } from "../ColumnMenu/ColumnMenu";
import type { ColumnConfigWInfo } from "../W_Table";
import { getColWInfo } from "./getColWInfo";
import { getColWidth } from "./getColWidth";
import { SORTABLE_CHART_COLUMNS } from "../ColumnMenu/NestedTimechartControls";

export const getFullColumnConfig = (
  tables: CommonWindowProps["tables"],
  w: Pick<WindowData<"table">, "columns" | "table_name">,
  data?: AnyObject[],
  windowWidth?: number,
): ColumnConfigWInfo[] => {
  try {
    const { table_name } = w;
    // const columns = cols || [];

    const t = tables.find((t) => t.name === table_name);

    let colsWInfo = getColWInfo(tables, w);

    /* Show file columns as Media format by default */
    colsWInfo = colsWInfo.map((r) => {
      const isFileColumn =
        (t?.info.isFileTable && r.name === "url") || r.info?.file;
      return {
        ...r,
        format:
          !r.format && isFileColumn ?
            { type: "Media", params: { type: "fromUrlEnding" } }
          : r.format,
      };
    });

    try {
      //@ts-ignore
      colsWInfo = getColWidth(
        colsWInfo.map((r) => ({
          ...r,
          ...(r.info ?? { udt_name: "text", tsDataType: "string" }),
        })),
        data,
        "name",
        windowWidth,
      ).map((c) => ({
        ...c,
        width: c.info?.udt_name === "uuid" ? 150 : c.width,
      }));
    } catch (e) {
      console.error(e);
    }

    /* If media table then set url column display format to Media  */
    const table = tables.find((t) => t.name === w.table_name);
    if (!w.columns?.length && table?.info.isFileTable) {
      colsWInfo = structuredClone(colsWInfo);
      const urlColumnIndex = colsWInfo.findIndex((c) => c.name === "url");
      const urlColumn = colsWInfo.splice(urlColumnIndex, 1)[0];
      const origNameColIdx = colsWInfo.findIndex(
        ({ name }) => name === "original_name",
      );
      const origNameCol = colsWInfo.splice(origNameColIdx, 1)[0];
      if (origNameCol) {
        colsWInfo.unshift(origNameCol);
      }
      if (urlColumn) {
        urlColumn.format = { type: "Media", params: { type: "fromUrlEnding" } };
        colsWInfo.unshift(urlColumn);
      }
    }

    return colsWInfo.slice(0);
  } catch (e) {
    console.error(e);
    throw e;
  }
};

/** It's a record to ensure all keys are present */
const COLUMN_CONFIG_KEYS: Record<keyof ColumnConfig, 1> = {
  idx: 1,
  computedConfig: 1,
  format: 1,
  name: 1,
  show: 1,
  style: 1,
  width: 1,
  nested: 1,
};
export const getMinimalColumnInfo = <CWI extends ColumnConfigWInfo>(
  columns: CWI[],
): Pick<CWI, keyof ColumnConfig>[] => {
  const colconfigKeys = getKeys(COLUMN_CONFIG_KEYS);
  return columns.map((c) => pickKeys(c, colconfigKeys, true));
};

export const updateWCols = (
  w: WindowSyncItem<"table">,
  newCols: WindowSyncItem<"table">["columns"] = null,
  nestedColumnName?: string,
) => {
  const newMinimalCols =
    newCols ?
      getMinimalColumnInfo(newCols).map((c) => {
        if (c.nested) {
          return {
            ...c,
            nested: {
              ...c.nested,
              columns: getMinimalColumnInfo(c.nested.columns),
            },
          };
        }

        return c;
      })
    : null;
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
          return { ...c, nested: { ...c.nested, columns: newMinimalCols } };
        }
        return c;
      }),
    });
  }
  return w.$update({ sort: [], columns: newMinimalCols });
};

export const getSortColumn = (
  sort: ColumnSort,
  columns: ColumnConfig[],
): ColumnConfig | undefined => {
  return columns.find((c) => {
    return (
      c.name === sort.key ||
      (typeof sort.key === "number" &&
        typeof c.name === "string" &&
        c.idx === sort.key) ||
      (c.nested?.chart?.type === "time" &&
        SORTABLE_CHART_COLUMNS.some(
          (sortCol) => sort.key === `${c.name}.${sortCol}`,
        )) ||
      c.nested?.columns.some((nc) => sort.key === `${c.name}.${nc.name}`)
    );
  });
};

export const getSort = (
  tables: CommonWindowProps["tables"],
  w: Pick<WindowSyncItem<"table">, "sort" | "columns" | "table_name">,
): ColumnSort[] => {
  const { sort } = w;

  if (!sort) return [];

  let _sort: ColumnSort[] = sort.map((s) => ({ ...s }));

  const cols = tables.find((t) => t.name === w.table_name)?.columns;
  if (!cols) return [];

  const wcols = w.columns;
  _sort = _sort.filter((s) => {
    if (!wcols) {
      /** Sort key must match a valid table column */
      return cols.some((c) => c.name === s.key);
    } else {
      const wcol = getSortColumn(s, wcols);
      if (wcol?.nested) {
        return true;
      }
      return cols.some((c) => {
        if (wcol?.computedConfig) {
          /** CountAll doesn't require a column */
          return (
            !wcol.computedConfig.column || wcol.computedConfig.column === c.name
          );
        } else if (wcol) {
          return wcol.name === c.name;
        }
      });
    }
  });

  return _sort;
};

export const getJoinedTables = (
  tables: DBSchemaTable[],
  tableName: string,
  db: DBHandlerClient,
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

export const simplifyFilter = (f: AnyObject | undefined) => {
  let result = f;
  if (result) {
    while (
      (result &&
        "$and" in result &&
        Array.isArray(result.$and) &&
        result.$and.length < 2) ||
      (result &&
        "$or" in result &&
        Array.isArray(result.$or) &&
        result.$or.length < 2)
    ) {
      if (result.$and) result = result.$and?.[0] ?? {};
      if (result?.$or) result = result.$or?.[0] ?? {};
    }
    result ??= {};
  }

  return result;
};
// static getCellStyle(
//   row: AnyObject,
//   wcol: ColumnConfig,
//   limits?: { minValue: any; maxValue: any; }
// ): CellStyle {
//   let res = {};

//   if (wcol && wcol.style && wcol.style.type && wcol.style.type !== "None") {

//     if(wcol.style.type === "Conditional"){

//     /* Need to get min max */
//     } else if (
//       wcol.style.type === "Barchart" ||
//       wcol.style.type === "Scale"
//     ) {
//       let { minValue, maxValue } = limits || {};
//       wcol.style.minValue = minValue;
//       wcol.style.maxValue = maxValue;
//     }

//     c.getCellStyle = (row, val, rv) => {

//       const style = StyleColumn.getStyle(wcol, wcol..tsDataType, row);
//       let res: React.CSSProperties = {}
//       if (style.cellColor) {
//         res = { ...res, background: style.cellColor };
//       }
//       if (style.textColor) {
//         res = { ...res, color: style.textColor };
//       }
//       if(wcol.style.type === "Barchart"){
//         res = { ...res, border: "1px solid var(--gray-200)" };
//       }
//       return res;
//     }

//       c.onRender = (row, val, renderedVal) => {
//         const style = StyleColumn.getStyle(wcol, c.tsDataType, row);
//         if (style && style.chipColor) {
//           return <div style={{
//             backgroundColor: style.chipColor,
//             padding: "6px 8px",
//             borderRadius: "1em",
//             width: "fit-content"
//           }}>
//             {renderedVal}
//           </div>
//         }

//         return renderedVal;
//       }

//   }

//   return res;
// }
