import { getFinalFilter } from "@common/filterUtils";
import type { AnyObject, ParsedJoinPath } from "prostgles-types";
import { reverseParsedPath } from "prostgles-types";
import { isDefined, quickClone } from "../utils/utils";
import type {
  Link,
  WindowData,
  WindowSyncItem,
} from "./Dashboard/dashboardUtils";
import W_Map from "./W_Map/W_Map";
import type { ActiveRow } from "./W_Table/W_Table";
import { getTimeChartFilters } from "./W_TimeChart/fetchData/getTimeChartLayersWithBins";

type SyncWindow =
  | WindowSyncItem<"table">
  | WindowSyncItem<"map">
  | WindowSyncItem<"sql">
  | WindowSyncItem<"timechart">;

export type CrossFilters = {
  crossFilters: AnyObject[];
  activeRowFilter?: AnyObject;
  all: AnyObject[];
};
type CrossFilterWindow =
  | Pick<WindowSyncItem<"table">, "id" | "table_name" | "type">
  | Pick<WindowSyncItem<"map">, "id" | "table_name" | "type">
  | Pick<WindowSyncItem<"timechart">, "id" | "table_name" | "type">;

export type GetJoinFiltersResult = {
  l: Link;
  f: AnyObject | undefined;
  w: SyncWindow;
  parsedPath: ParsedJoinPath[];
  activeRowFilter: AnyObject | undefined;
};

const getJoinFilters = (
  w: CrossFilterWindow,
  startLinkId: string | undefined,
  activeRow: ActiveRow | undefined = undefined,
  links: Link[],
  _windows: SyncWindow[],
  previousWids: string[] = [],
  previousPath: ParsedJoinPath[] = [],
): GetJoinFiltersResult[] => {
  const windows = _windows.map((w) => w.$get()) as SyncWindow[]; // To ensure we get latest data
  if (w.type !== "table" && !previousWids.length && !startLinkId) {
    throw "startLinkId is required for non-table windows";
  }
  const myLinks: GetJoinFiltersResult[] = links
    .filter((l) => !startLinkId || previousWids.length || l.id === startLinkId)
    .map((link) => {
      const linkWindowIds = [link.w1_id, link.w2_id];
      const linkWindows = windows.filter(
        (w) => !w.closed && !w.deleted && linkWindowIds.includes(w.id),
      );
      const otherWindow = linkWindows.find(({ id }) => id !== w.id);
      if (
        !otherWindow ||
        linkWindows.length !== 2 ||
        !linkWindowIds.includes(w.id) ||
        /**
         * TODO: allow self-joins for maps
         */
        previousWids.some((pw) => linkWindowIds.includes(pw))
      ) {
        return;
      }

      const activeRowFilter =
        otherWindow.id === activeRow?.window_id ?
          activeRow.row_filter
        : undefined;
      const getChartFilters = (
        chartFilters: AnyObject[],
        reverseToTable: string | undefined,
      ) => {
        if (link.options.type === "map" || link.options.type === "timechart") {
          const { dataSource } = link.options;
          const joinPath =
            dataSource?.type === "table" ? dataSource.joinPath : undefined;
          if (joinPath?.length || previousPath.length) {
            const parsedPath =
              !joinPath ? []
              : reverseToTable ?
                reverseParsedPath(joinPath.slice(0), reverseToTable)
              : joinPath.slice(0);
            const f = {
              $existsJoined: {
                path: [...previousPath, ...parsedPath],
                filter:
                  !chartFilters.length ? {} : { $and: chartFilters.concat({}) },
              },
            };

            return { parsedPath, f };
          }
        }
        return { parsedPath: [], f: { $and: chartFilters } };
      };

      /** Table getting chart filters */
      if (
        w.type === "table" &&
        w.type !== otherWindow.type &&
        otherWindow.type === link.options.type
      ) {
        const chartCol = link.options.columns[0]?.name;
        if (!chartCol) return undefined;
        let chartFilters: AnyObject[] = [];
        if (otherWindow.type === "map") {
          if (otherWindow.options.extent) {
            chartFilters =
              otherWindow.options.extentBehavior !== "filterToMapBounds" ?
                []
              : [W_Map.extentToFilter(otherWindow.options.extent, chartCol)];
          }
        } else {
          chartFilters = getTimeChartFilters(otherWindow, chartCol);
        }

        return {
          l: link,
          w: otherWindow,
          ...getChartFilters(chartFilters, undefined),
          activeRowFilter:
            activeRowFilter ?
              getChartFilters([activeRowFilter], undefined).f
            : undefined,
        };

        /** Table to table */
      } else if (
        otherWindow.type === "table" &&
        link.options.type === "table"
      ) {
        const isLTR = link.w1_id === w.id;
        const { tablePath } = link.options;
        const currentParsedPath =
          isLTR ?
            tablePath.slice(0)
          : reverseParsedPath(tablePath.slice(0), otherWindow.table_name);
        const parsedPath = [...previousPath, ...currentParsedPath];
        const otherTableFilters = getTableFilters(otherWindow);
        return {
          l: link,
          w: otherWindow,
          parsedPath,
          f: {
            $existsJoined: {
              path: parsedPath,
              filter:
                !otherTableFilters.length ?
                  {}
                : {
                    $and: otherTableFilters.concat({}),
                  },
            },
          },
          activeRowFilter:
            otherWindow.id === activeRow?.window_id ?
              {
                $existsJoined: {
                  path: parsedPath,
                  filter: activeRow.row_filter,
                },
              }
            : undefined,
        };
        /** Chart to their table */
      } else if (
        otherWindow.type === "table" &&
        link.options.type === w.type &&
        w.type !== "table"
      ) {
        const otherWindowFilters = getTableFilters(otherWindow);
        const chartFilters = getChartFilters(
          otherWindowFilters,
          otherWindow.table_name,
        );

        return {
          l: link,
          w: otherWindow,
          ...chartFilters,
          activeRowFilter:
            activeRowFilter ?
              getChartFilters([activeRowFilter], otherWindow.table_name).f
            : undefined,
        };
      } else {
        throw "Unexpected window/link combination";
      }
    })
    .filter(isDefined);

  const nextLinks: typeof myLinks = myLinks.flatMap((d) => {
    /** Only tables act as nodes. Charts are syncs */
    if (d.w.type === "sql") {
      return [];
    }
    return getJoinFilters(
      d.w,
      startLinkId,
      activeRow,
      links,
      _windows,
      [...previousWids, w.id],
      [...previousPath, ...d.parsedPath],
    );
  });

  return [...myLinks, ...nextLinks];
};

const getTableFilters = (table: WindowData<"table">) =>
  table.filter?.map((f) => getFinalFilter({ ...f })).filter(isDefined) ?? [];

export const getCrossFilters = (
  w: CrossFilterWindow,
  startLinkId: string | undefined,
  activeRow: ActiveRow | undefined = undefined,
  links: Link[],
  _windows: SyncWindow[] | WindowSyncItem[],
): CrossFilters => {
  // To ensure we get latest data
  const windows = _windows.map((w) => w.$get()) as SyncWindow[];

  const joinFilters = getJoinFilters(w, startLinkId, activeRow, links, windows);

  const crossFilters = joinFilters
    .map((d) => d.f && quickClone({ ...d.f }))
    .filter(isDefined);
  const activeRowFilter = joinFilters.find(
    (d) => d.activeRowFilter,
  )?.activeRowFilter;

  // console.log("join filters", w.type, crossFilters);

  return {
    activeRowFilter,
    crossFilters,
    all: [activeRowFilter, ...crossFilters].filter(isDefined),
  };
};
