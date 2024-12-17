import { isDefined } from "prostgles-types";
import type { LinkSyncItem, WindowSyncItem } from "../Dashboard/dashboardUtils";
import { getCrossFilters } from "../joinUtils";
import { getLinkColor } from "../W_Map/getMapLayerQueries";
import type { ActiveRow } from "../W_Table/W_Table";
import type { ProstglesTimeChartLayer } from "./W_TimeChart";
import { tryCatchV2 } from "../WindowControls/TimeChartLayerOptions";

type Args = {
  links: LinkSyncItem[];
  myLinks: LinkSyncItem[];
  windows: WindowSyncItem[];
  active_row: ActiveRow | undefined;
  w: WindowSyncItem<"timechart">;
};

export const getTimeChartLayer = ({
  links,
  link,
  windows,
  active_row,
  w,
}: Args & { link: LinkSyncItem }): ProstglesTimeChartLayer[] => {
  const l = link;
  const wTable = windows.find(
    (_w) =>
      (_w.type === "table" || _w.type === "sql") &&
      _w.id !== w.id &&
      [l.w1_id, l.w2_id].includes(_w.id),
  ) as WindowSyncItem<"table"> | WindowSyncItem<"sql"> | undefined;

  const lOpts = l.options;
  if (lOpts.type !== "timechart") {
    throw "Not expected";
  }

  return lOpts.columns
    .flatMap(({ name: dateColumn, colorArr, statType }, columnIndex) => {
      const color = getLinkColor(colorArr).colorStr;
      const commonOpts = {
        _id: `${l.id}-${columnIndex}`,
        linkId: l.id,
        disabled: !!l.disabled,
        groupByColumn: lOpts.groupByColumn,
        statType,
        dateColumn,
        updateOptions: (newOptions) =>
          l.$update({ options: { ...lOpts, ...newOptions } }),
      } as const;

      const localTableName =
        lOpts.dataSource?.type === "local-table" ?
          lOpts.dataSource.localTableName
        : lOpts.localTableName;
      const joinPath =
        lOpts.dataSource?.type === "table" ?
          lOpts.dataSource.joinPath
        : lOpts.joinPath;
      if (wTable?.type === "table" || localTableName) {
        if (localTableName) {
          return {
            ...commonOpts,
            type: "table",
            tableName: localTableName,
            path: joinPath,
            tableFilter: undefined,
            externalFilters: [],
            color,
          } satisfies ProstglesTimeChartLayer;
        }

        if (!wTable || !wTable.table_name) {
          throw "Unexpected: wTable or table_name missing";
        }

        /** Map will always join to the same table name. Use that table */
        const jf = getCrossFilters(w, active_row, links, windows as any);

        const layer: ProstglesTimeChartLayer = {
          ...commonOpts,
          type: "table",
          tableName: wTable.table_name,
          path: joinPath,
          // activeRowFilter: jf.activeRowFilter,
          tableFilter: undefined, // getSmartGroupFilter(tbl.filter || []),
          externalFilters: jf.all,
          color,
        };

        return layer;
      } else if (wTable) {
        if ((wTable as any).type !== "sql" || !lOpts.sql) {
          throw "Unexpected: wTable or table_name missing";
        }
        // const latestW = tbl.$get();
        const layer: ProstglesTimeChartLayer = {
          ...commonOpts,
          type: "sql",
          sql: lOpts.sql,
          withStatement:
            lOpts.dataSource?.type === "sql" ?
              lOpts.dataSource.withStatement
            : "",
          color,
        };

        return layer;
      }
    })
    .filter(isDefined);
};

export const getTimeChartLayerQueries = (args: Args) => {
  const { links, myLinks } = args;
  const layerQueries: ProstglesTimeChartLayer[] = myLinks
    .flatMap((link) => {
      const { data = [] } = tryCatchV2(() =>
        getTimeChartLayer({ ...args, link }),
      );
      return data;
    })
    .filter(isDefined);

  return layerQueries;
};
