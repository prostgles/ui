import { isDefined } from "prostgles-types";
import { parseFullFilter } from "../../../../commonTypes/publishUtils";
import type {
  Link,
  LinkSyncItem,
  WindowSyncItem,
} from "../Dashboard/dashboardUtils";
import { PALETTE, windowIs } from "../Dashboard/dashboardUtils";
import type { CrossFilters } from "../joinUtils";
import { getCrossFilters } from "../joinUtils";
import { getSmartGroupFilter } from "../SmartFilter/SmartFilter";
import type { LayerOSM, LayerQuery, LayerSQL, LayerTable } from "./W_Map";
import type { ActiveRow } from "../W_Table/W_Table";
import type { DeckGlColor } from "../Map/DeckGLMap";

type Args = {
  links: LinkSyncItem[];
  myLinks: LinkSyncItem[];
  windows: WindowSyncItem[];
  active_row: ActiveRow | undefined;
  w: WindowSyncItem<"map">;
};

export const getLinkColorV2 = (l?: Link, opacity?: number) => {
  const colorArr =
    l?.options.type !== "table" ?
      l?.options.columns[0]?.colorArr
    : l.options.colorArr;

  return getLinkColor(colorArr, opacity);
};

export const getLinkColor = (value: number[] | undefined, opacity?: number) => {
  const parseVal = (v: number) => {
    if (typeof v === "number" && v >= 0 && v <= 255) return v;
    return 99;
  };
  const defaultVal = PALETTE.c1.get(1, "deck");
  const colorArrRaw = value ?? defaultVal;
  const colorArrParsed = colorArrRaw.map(parseVal);
  const [r, g, b, a] = colorArrParsed;
  const colorOpacity =
    Number.isFinite(opacity) ? opacity
    : Number.isFinite(a) ? a
    : 1;
  const colorArr: DeckGlColor = [r, g, b, colorOpacity * 255];
  const colorArrStr = [r, g, b, colorOpacity];
  const colorStr = `rgba(${colorArrStr.join()})`;

  return {
    colorArr,
    colorStr,
  };
};

export const getMapLayerQueries = ({
  links,
  myLinks,
  windows,
  active_row,
  w,
}: Args) => {
  const layerQueries: LayerQuery[] = myLinks
    .flatMap((l: Link) => {
      const lOpts = l.options;
      if (
        lOpts.type !== "map" ||
        (!lOpts.columns.length && !lOpts.osmLayerQuery)
      ) {
        throw "columns/OSM query missing from link";
      }
      const isLocalLayerLink = l.w1_id === l.w2_id;
      const linkW =
        isLocalLayerLink ? undefined : (
          windows.find(
            (_w) =>
              (windowIs(_w, "table") || windowIs(_w, "sql")) &&
              _w.id !== w.id &&
              [l.w1_id, l.w2_id].includes(_w.id),
          )
        );
      const _joinEndTable =
        lOpts.dataSource?.type === "table" ?
          lOpts.dataSource.joinPath
        : undefined;
      const joinEndTable = (_joinEndTable ?? lOpts.joinPath)?.at(-1);
      const _localTableName =
        lOpts.dataSource?.type === "local-table" ?
          lOpts.dataSource.localTableName
        : undefined;
      const tableName =
        isLocalLayerLink ?
          (_localTableName ?? lOpts.localTableName)
        : (joinEndTable?.table ?? linkW?.table_name);

      if (lOpts.osmLayerQuery) {
        const { colorArr, colorStr } = getLinkColor(
          lOpts.mapColorMode?.type === "fixed" ?
            lOpts.mapColorMode.colorArr
          : [0, 0, 0, 1],
        );
        const fillColor = colorArr;
        const lineColor = colorArr;
        const color = colorStr;
        const query = lOpts.osmLayerQuery;
        return {
          ...l.options,
          disabled: !!l.disabled,
          _id: `${l.id}`,
          linkId: l.id,
          fillColor,
          lineColor,
          color,
          geomColumn: "",
          type: "osm",
          query,
        } satisfies LayerOSM;
      }

      const columnLayerQueries: LayerQuery[] = lOpts.columns
        .flatMap(({ colorArr: _colorArr, name: geomColumn }, columnIndex) => {
          const { colorArr, colorStr } = getLinkColor(_colorArr);

          const fillColor = colorArr;
          const lineColor = colorArr;
          const color = colorStr;
          const commonOpts = {
            ...l.options,
            disabled: !!l.disabled,
            _id: `${l.id}-${columnIndex}`,
            linkId: l.id,
            fillColor,
            lineColor,
            color,
            geomColumn,
            wid: linkW?.id,
          };

          if (tableName) {
            const jf: CrossFilters =
              !linkW ?
                {
                  all: [],
                  crossFilters: [],
                  activeRowFilter: undefined,
                }
              : getCrossFilters(w, active_row, links, windows);

            const smartGroupFilter =
              lOpts.dataSource?.type === "local-table" ?
                lOpts.dataSource.smartGroupFilter
              : lOpts.smartGroupFilter;
            const localLayerFilter =
              (!smartGroupFilter ? undefined : (
                parseFullFilter(smartGroupFilter, undefined, undefined)
              )) ?? {};
            const joinPath =
              lOpts.dataSource?.type === "table" ?
                lOpts.dataSource.joinPath
              : lOpts.joinPath;
            const joinInfo =
              joinPath && w.table_name && joinEndTable ?
                {
                  joinStartTable: w.table_name,
                  path: joinPath,
                }
              : ({
                  joinStartTable: undefined,
                  path: undefined,
                } satisfies Pick<LayerTable, "joinStartTable" | "path">);

            const lt: LayerTable = {
              ...commonOpts,
              type: "table",
              tableName,
              ...joinInfo,
              externalFilters: [...jf.all, localLayerFilter],
              tableFilter: getSmartGroupFilter(linkW?.filter || []),
              joinFilter: jf.activeRowFilter,
              // elevation: 1000
            };
            return lt;

            /** Must be sql */
          } else if (linkW?.type === "sql") {
            const latestW = linkW.$get();

            if (!lOpts.sql) {
              throw "Unexpected: sql missing";
            }
            const lsql: LayerSQL = {
              ...commonOpts,
              type: "sql",
              sql: lOpts.sql,
              withStatement:
                lOpts.dataSource?.type === "sql" ?
                  lOpts.dataSource.withStatement
                : "",
            };
            if (!lsql.sql) {
              return undefined;
            }
            return lsql;
          } else {
            console.error("linkW is missing?");
          }
        })
        .filter(isDefined);

      return columnLayerQueries;
    })
    .filter(isDefined);

  return layerQueries;
};
