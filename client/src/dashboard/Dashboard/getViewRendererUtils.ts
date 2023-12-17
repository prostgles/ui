import { AnyObject, ParsedJoinPath } from "prostgles-types"; 
import { SmartGroupFilter } from "../../../../commonTypes/filterUtils";
import { OmitDistributive } from "../../../../commonTypes/utils";
import { matchObj } from "../ProstglesSQL/W_SQL"; 
import { isEmpty } from "./Dashboard";
import { ChartType, DBSchemaTablesWJoins, getDefaultLayout, Link, LinkSyncItem, NewChartOpts, PALETTE, WindowData, WindowSyncItem, WorkspaceSyncItem } from "./dashboardUtils";
import {  ViewRenderer,ViewRendererProps } from "./ViewRenderer";
import { ActiveRow } from "../W_Table/W_Table";
import { DBSSchema } from "../../../../commonTypes/publishUtils";

type Args = ViewRendererProps & {
  links: LinkSyncItem[];
  windows: WindowSyncItem[]; 
  workspace: WorkspaceSyncItem;
  tables: DBSchemaTablesWJoins;
}
export const getViewRendererUtils = function(this: ViewRenderer, { prgl, workspace, windows, links, tables }: Args){

  const addWindow = async <CT extends ChartType,>(w: {
    name?: string,
    type: CT,
    table_name?: string | null,
    options?: WindowData["options"]
  }, filter: SmartGroupFilter = []) => {
    const { type, table_name, options = {}, name } = w;
    const res = await prgl.dbs.windows.insert({
      name,
      type,
      table_name,
      options,
      filter,
      layout: getDefaultLayout("111"),
      fullscreen: false,
      workspace_id: workspace.id,
      limit: 500,

    } as DBSSchema["windows"],
      { returning: "*" }
    );

    setTimeout(() => {
      if (!document.querySelector(`[data-box-id="${res.id}"]`)) {
        console.error("SYNC FAIL BUG, REFRESHING");
        location.reload();
      }
    }, 1000);

    return res;
  };

  // const layouts = windows.map(q => parseLayout({  ...q.layout }, q.id));
  // // console.log(JSON.stringify(layouts, null, 2))

  const addLink = (l: {
    w1_id: string;
    w2_id: string;
    linkOpts: OmitDistributive<Link["options"], "color" | "colorKey">
  }) => {

    const { links } = this.getOpenedLinksAndWindows()
    const { w1_id, w2_id } = l;
      // activeLinks = links.filter(l => windows.find(w => [l.w1_id, l.w2_id].includes(w.id))),
      // activeColors = countDupes([
      //   ...Object.keys(PALETTE).sort(() => .5 - Math.random()),
      //   ...activeLinks.map(l => getLinkColor(l).colorStr).filter(c => c)
      // ]),
      // leastUsedColorKey = Object.keys(activeColors).pop()!;

    const myLinks = links.filter(l => [l.w1_id, l.w2_id].find(wid => [w1_id, w2_id].includes(wid)));
    const cLink = myLinks.find(l => l.options.colorArr);
    const colorOpts = {
      colorArr: cLink?.options.colorArr ?? PALETTE.c4.get(1, "deck"),
    } as const;

    const options: Link["options"] = {
      ...colorOpts,
      ...l.linkOpts,
    }
    
    return prgl.dbs.links.insert({
      w1_id,
      w2_id,
      workspace_id: workspace.id,
      options,
      last_updated: undefined as any,
      user_id: undefined as any,
    }, { returning: "*" });
  };


  const onLinkTable = async (q: WindowSyncItem, tblName: string, tablePath: ParsedJoinPath[]) => {
    const w2_id = await this.props.loadTable({ type: "table", table: tblName, fullscreen: false });
    await addLink({ w1_id: q.id, w2_id, linkOpts: { type: "table", tablePath } });
    if (q.fullscreen) q.$update({ fullscreen: false });
  }

  const onAddChart = (!prgl.dbs.windows.insert as boolean) ? undefined : async (args: NewChartOpts, q: WindowData) => {

    const { name, linkOpts } = args;
    const type = args.linkOpts.type;
    let extra: Partial<WindowData<"map">> | Partial<WindowData<"timechart">> = {};
    if (type === "map") {
      extra = {
        options: {
          tileAttribution: {
            title: "© OpenStreetMap",
            url: "https://www.openstreetmap.org/"
          },
          aggregationMode: {
            type: "limit",
            limit: 2000,
            wait: 2
          },
        }
      }
    } else if(type === "timechart"){
      extra = {
        options: {
          showBinLabels: "off",
          binValueLabelMaxDecimals: 3,
          statType: "Count All",
          missingBins: "show nearest",
        }
      }
    }
    const w = await addWindow({ name, type, ...extra }) as WindowData;

    addLink({ w1_id: q.id, w2_id: w.id, linkOpts });
  }

  type ClickRowOpts = { type: "table-row"; } | { type: "timechart"; value: ActiveRow["timeChart"] }
  const onClickRow = async (rowOrFilter: AnyObject | undefined, table_name: string, wid: string, opts: ClickRowOpts) => {

    if (!rowOrFilter || !table_name || this.state.active_row && this.state.active_row.window_id !== wid) {
      if (this.state.active_row) {
        this.setState({ active_row: undefined })
      }
      return;
    }

    let row_filter: AnyObject = {};
    const cols = tables.find(t => t.name === table_name)?.columns ?? [];
    const pKeys = cols.filter(c => c.is_pkey);

    if(opts.type === "timechart"){
      row_filter = { ...rowOrFilter }
    
    /**
     * Prefer pkey but if missing then use other non formated columns
     */
    } else if (pKeys.length && pKeys.every(pk => pk.name in rowOrFilter)) {
      pKeys.map(pk => {
        row_filter[pk.name] = rowOrFilter[pk.name];
      })
    } else if ("$rowhash" in rowOrFilter) {
      row_filter.$rowhash = rowOrFilter.$rowhash;
    } else {
      cols.map(c => {
        if (c.tsDataType === "number" || c.tsDataType === "string" || c.is_pkey) {
          row_filter[c.name] = rowOrFilter[c.name];
        }
      })
    }

    /* Must link to at least one other table */
    const rl_ids = links.filter(l =>
      [l.w1_id, l.w2_id].includes(wid) &&
      windows.filter(_w => _w.id !== wid)
        .find(_w => [l.w1_id, l.w2_id].includes(_w.id))
    );
    
    let active_row: ActiveRow | undefined = !rl_ids.length? undefined : {
      window_id: wid,
      table_name: table_name,
      row_filter,
      timeChart: opts.type === "timechart"? opts.value : undefined,
    };

    /* If clicking on the same row then disable active_row */
    if (
      active_row &&
      !isEmpty(this.state.active_row) &&
      this.state.active_row?.window_id === active_row.window_id &&
      matchObj(this.state.active_row.row_filter, active_row.row_filter)
    ) {
      active_row = undefined;
    }

    if (this.state.active_row !== active_row) {
      this.setState({ active_row });
    }
 
  }


  return {
    onClickRow,
    onAddChart,
    addWindow,
    onLinkTable,
  }
}

function countDupes(arr: string[]){
  return arr.reduce<{ [key: string]: number }>((a, v) => ({ ...a, [v]: (a[v] || 0)+1 }), {});
}
