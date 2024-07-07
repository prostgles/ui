import { isDefined } from "prostgles-types";
import type { LinkSyncItem, WindowSyncItem } from "../Dashboard/dashboardUtils";
import { getCrossFilters } from "../joinUtils";
import { getLinkColor } from "../W_Map/getMapLayerQueries";
import type { ActiveRow } from "../W_Table/W_Table";
import { getSmartGroupFilter } from "../SmartFilter/SmartFilter";
import type { ProstglesTimeChartLayer } from "./W_TimeChart";

type Args = {
  links: LinkSyncItem[];
  myLinks: LinkSyncItem[];
  windows: WindowSyncItem[];
  active_row: ActiveRow | undefined;
  w: WindowSyncItem<"timechart">;
}

export const getTimeChartLayer = ({ links, link, windows, active_row, w }: Args & { link: LinkSyncItem }): ProstglesTimeChartLayer[] => {
  const l = link;
  const tbl = windows.find(_w => (_w.type === "table" || _w.type === "sql") && _w.id !== w.id && [l.w1_id, l.w2_id].includes(_w.id)) as WindowSyncItem<"table"> | undefined;
  const lOpts = l.options;
  if(lOpts.type !== "timechart"){
    throw "Not expected"
  }

  return lOpts.columns.flatMap(({ name: dateColumn, colorArr, statType }, columnIndex) => {
    const color = getLinkColor(colorArr).colorStr;
    const commonOpts = {
      _id: `${l.id}-${columnIndex}`,
      linkId: l.id,
      disabled: !!l.disabled,
      groupByColumn: lOpts.groupByColumn,
      statType,
      dateColumn,
      updateOptions: (newOptions) => l.$update({ options: { ...lOpts, ...newOptions } }), 
    } as const;

    if(tbl?.type === "table" || lOpts.localTableName){
      // const activeRowFilter = getActiveRowFilter(q.id);

      if(lOpts.localTableName){
        return {
          ...commonOpts,
          type: "table",
          tableName: lOpts.localTableName,
          path: lOpts.joinPath,
          tableFilter: undefined,
          externalFilters: [],
          color
        } satisfies ProstglesTimeChartLayer;
      }

      if(!tbl){
        throw "Unexpected";
      }

      /** Map will always join to the same table name. Use that table */
      const jf = getCrossFilters(w, active_row, links, windows as any);

      const layer: ProstglesTimeChartLayer = {
        ...commonOpts,
        type: "table",
        tableName: tbl.table_name,
        path: lOpts.joinPath,
        // activeRowFilter: jf.activeRowFilter,
        tableFilter: undefined,// getSmartGroupFilter(tbl.filter || []),
        externalFilters: jf.all,
        color
      }
    
      return layer;
    } else if(tbl) {
      
      const layer: ProstglesTimeChartLayer =  {
        ...commonOpts,
        type: "sql",
        sql: lOpts.fromSelected? tbl.selected_sql : tbl.sql,
        color
      }
      
      return layer;
    } 

  }).filter(isDefined);
}

export const getTimeChartLayerQueries = (args: Args) => {
  const { links, myLinks } = args;
  const layerQueries: ProstglesTimeChartLayer[] = myLinks.flatMap(link => getTimeChartLayer({ ...args, link })).filter(isDefined)

  return layerQueries;
}