import type { AnyObject, ParsedJoinPath } from "prostgles-types";
import { reverseParsedPath } from "prostgles-types";
import { getFinalFilter } from "../../../commonTypes/filterUtils";
import { isDefined } from "../utils";
import type {
  Link,
  WindowData,
  WindowSyncItem,
} from "./Dashboard/dashboardUtils";
import W_Map from "./W_Map/W_Map";
import type { ActiveRow } from "./W_Table/W_Table";
import { getTimeChartFilters } from "./W_TimeChart/getTimeChartLayersWithBins";

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

export const getJoinFilters = (
  w: CrossFilterWindow,
  activeRow: ActiveRow | undefined = undefined,
  links: Link[],
  _windows: SyncWindow[],
  previousWids: string[] = [],
  previousPath: ParsedJoinPath[] = [],
): GetJoinFiltersResult[] => {
  const windows = _windows.map((w) => w.$get()) as SyncWindow[]; // To ensure we get latest data

  const myLinks: GetJoinFiltersResult[] = links
    .map((l) => {
      const lwids = [l.w1_id, l.w2_id];
      const lws = windows.filter(
        (w) => !w.closed && !w.deleted && lwids.includes(w.id),
      );
      const otherW = lws.find((lw) => lw.id !== w.id);
      const getTableFilters = (table: WindowData<"table">) =>
        table.filter?.map((f) => getFinalFilter(f)).filter(isDefined) ?? [];
      if (
        otherW &&
        lws.length === 2 &&
        lwids.includes(w.id) &&
        !previousWids.some((pw) => lwids.includes(pw))
      ) {
        const activeRowFilter =
          otherW.id === activeRow?.window_id ? activeRow.row_filter : undefined;
        const getChartFilters = (
          chartFilters: AnyObject[],
          reverseToTable: string | undefined,
        ) => {
          if (l.options.type === "map" || l.options.type === "timechart") {
            const { joinPath } = l.options;
            if (joinPath?.length || previousPath.length) {
              const parsedPath =
                !joinPath ? []
                : reverseToTable ?
                  reverseParsedPath(joinPath.slice(0), reverseToTable)
                : joinPath.slice(0);
              const f = {
                $existsJoined: {
                  path: [...previousPath, ...parsedPath],
                  filter: { $and: chartFilters.concat({}) },
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
          w.type !== otherW.type &&
          otherW.type === l.options.type
        ) {
          const chartCol = l.options.columns[0]?.name;
          if (!chartCol) return undefined;
          let chartFilters: AnyObject[] = [];
          if (otherW.type === "map") {
            if (otherW.options.extent) {
              chartFilters =
                otherW.options.extentBehavior !== "filterToMapBounds" ?
                  []
                : [
                    W_Map.extentToFilter(
                      otherW.options.extent as any,
                      chartCol,
                    ),
                  ];
            }
          } else {
            chartFilters = getTimeChartFilters(otherW, chartCol);
          }

          return {
            l,
            w: otherW,
            ...getChartFilters(chartFilters, undefined),
            activeRowFilter:
              activeRowFilter ?
                getChartFilters([activeRowFilter], undefined).f
              : undefined,
          };

          /** Table to table */
        } else if (otherW.type === "table" && l.options.type === "table") {
          const isLTR = l.w1_id === w.id;
          const { tablePath } = l.options;
          const currentParsedPath =
            isLTR ?
              tablePath.slice(0)
            : reverseParsedPath(tablePath.slice(0), otherW.table_name);
          const parsedPath = [...previousPath, ...currentParsedPath];
          return {
            l,
            w: otherW,
            parsedPath,
            f: {
              $existsJoined: {
                path: parsedPath,
                filter: {
                  $and: getTableFilters(otherW).concat({}),
                },
              },
            },
            activeRowFilter:
              otherW.id === activeRow?.window_id ?
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
          otherW.type === "table" &&
          l.options.type === w.type &&
          w.type !== "table"
        ) {
          return {
            l,
            w: otherW,
            ...getChartFilters(getTableFilters(otherW), otherW.table_name),
            // activeRowFilter,
            activeRowFilter:
              activeRowFilter ?
                getChartFilters([activeRowFilter], otherW.table_name).f
              : undefined,
          };
        } else {
          throw "Unexpected window/link combination";
        }
      }
    })
    .filter(isDefined);

  const nextLinks: typeof myLinks = myLinks.flatMap((d) => {
    if (d.w.type !== "table") {
      return [];
    }
    return getJoinFilters(
      d.w,
      activeRow,
      links,
      _windows,
      [...previousWids, w.id],
      [...previousPath, ...d.parsedPath],
    );
  });

  return [...myLinks, ...nextLinks];
};
export const getCrossFilters = (
  w: CrossFilterWindow,
  activeRow: ActiveRow | undefined = undefined,
  links: Link[],
  _windows: SyncWindow[] | WindowSyncItem[],
): CrossFilters => {
  // To ensure we get latest data
  const windows = _windows.map((w) => w.$get()) as SyncWindow[];

  const jf = getJoinFilters(w, activeRow, links, windows);
  const crossFilters = jf.map((d) => d.f).filter(isDefined);
  const activeRowFilter = jf.find((d) => d.activeRowFilter)?.activeRowFilter;

  return {
    activeRowFilter,
    crossFilters,
    all: [activeRowFilter, ...crossFilters].filter(isDefined),
  };
};
