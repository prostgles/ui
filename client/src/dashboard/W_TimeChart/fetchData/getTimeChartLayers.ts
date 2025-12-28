import { isDefined, tryCatchV2 } from "prostgles-types";
import type {
  LinkSyncItem,
  WindowSyncItem,
} from "../../Dashboard/dashboardUtils";
import { getCrossFilters } from "../../joinUtils";
import { getLinkColor } from "../../W_Map/fetchData/getMapLayerQueries";
import type { ActiveRow } from "../../W_Table/W_Table";
import type { ProstglesTimeChartLayer } from "../W_TimeChart";

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
  const parentWindow = windows.find(
    (_w) =>
      (_w.type === "table" || _w.type === "sql") &&
      _w.id !== w.id &&
      [l.w1_id, l.w2_id].includes(_w.id),
  ) as WindowSyncItem<"table"> | WindowSyncItem<"sql"> | undefined;

  const lOpts = l.options;
  if (lOpts.type !== "timechart") {
    throw "Not expected";
  }

  const { dataSource } = lOpts;
  return lOpts.columns
    .flatMap(({ name: dateColumn, colorArr, statType }, columnIndex) => {
      const color = getLinkColor(colorArr).colorStr;
      const commonOpts = {
        _id: `${l.id}-${columnIndex}`,
        title: lOpts.title,
        linkId: l.id,
        disabled: !!l.disabled,
        groupByColumn: lOpts.groupByColumn,
        statType,
        dateColumn,
      } as const;

      const localTableName =
        dataSource?.type === "local-table" ?
          dataSource.localTableName
        : undefined;
      const joinPath =
        dataSource?.type === "table" ? dataSource.joinPath : undefined;
      if (parentWindow?.type === "table" || localTableName) {
        if (dataSource?.type === "local-table") {
          return {
            ...commonOpts,
            type: "local-table",
            localTableName: dataSource.localTableName,
            smartGroupFilter: dataSource.smartGroupFilter,
            color,
          } satisfies ProstglesTimeChartLayer;
        }

        if (!parentWindow || !parentWindow.table_name) {
          throw "Unexpected: wTable or table_name missing";
        }

        /** Map will always join to the same table name. Use that table */
        const jf = getCrossFilters(w, active_row, links, windows);

        const layer: ProstglesTimeChartLayer = {
          ...commonOpts,
          type: "table",
          tableName: parentWindow.table_name,
          joinPath,
          externalFilters: jf.all,
          color,
        };

        return layer;
      } else if (parentWindow) {
        const linkSql =
          lOpts.dataSource?.type === "sql" ? lOpts.dataSource.sql : undefined;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (parentWindow.type !== "sql" || !linkSql) {
          throw "Unexpected: sql/window missing";
        }
        const layer: ProstglesTimeChartLayer = {
          ...commonOpts,
          type: "sql",
          sql: linkSql,
          withStatement:
            lOpts.dataSource?.type === "sql" ?
              lOpts.dataSource.withStatement
            : "",
          color,
        };

        return layer;
      } else if (dataSource?.type === "sql") {
        const layer: ProstglesTimeChartLayer = {
          ...commonOpts,
          type: "sql",
          sql: dataSource.sql,
          withStatement: "",
          color,
        };

        return layer;
      } else if (dataSource) {
        throw (
          "Unexpected timechart layer source: " + JSON.stringify(dataSource)
        );
      }
    })
    .filter(isDefined);
};

export const getTimeChartLayerQueries = (args: Args) => {
  const { myLinks } = args;
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
