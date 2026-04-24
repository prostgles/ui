import { matchObj } from "@common/utils";
import { type AnyObject, isEmpty } from "prostgles-types";
import type { ActiveRow } from "../W_Table/W_Table";
import type {
  DBSchemaTablesWJoins,
  LinkSyncItem,
  WindowSyncItem,
  WorkspaceSyncItem,
} from "./dashboardUtils";
import type { ViewRenderer, ViewRendererProps } from "./ViewRenderer";

type Args = ViewRendererProps & {
  links: LinkSyncItem[];
  windows: WindowSyncItem[];
  workspace: WorkspaceSyncItem;
  tables: DBSchemaTablesWJoins;
};
export const getViewRendererUtils = function (
  this: ViewRenderer,
  { prgl, workspace, windows, links, tables }: Args,
) {
  // const addChart =
  //   (!prgl.dbs.windows.insert as boolean) ?
  //     undefined
  //   : async (args: NewChartOpts, parentW: WindowData) => {
  //       const { name, linkOpts } = args;
  //       const type = args.linkOpts.type;
  //       let extra:
  //         | Pick<WindowData<"map">, "parent_window_id" | "options">
  //         | Pick<WindowData<"timechart">, "parent_window_id" | "options"> = {
  //         parent_window_id: null,
  //       };

  //       if (type === "map") {
  //         extra = {
  //           parent_window_id: parentW.id,
  //           options: {
  //             dataOpacity: 0.5,
  //             basemapOpacity: 0.25,
  //             basemapDesaturate: 0,
  //             tileAttribution: {
  //               title: "© OpenStreetMap",
  //               url: "https://www.openstreetmap.org/",
  //             },
  //             aggregationMode: {
  //               type: "limit",
  //               limit: 2000,
  //               wait: 2,
  //             },
  //             refresh: {
  //               type: "Realtime",
  //               throttleSeconds: 1,
  //               intervalSeconds: 1,
  //             },
  //             showCardOnClick: true,
  //             showAddShapeBtn: true,
  //           },
  //         };
  //       } else if (type === "timechart") {
  //         extra = {
  //           parent_window_id: parentW.id,
  //           options: {
  //             showBinLabels: "off",
  //             binValueLabelMaxDecimals: 3,
  //             missingBins: "ignore",
  //             refresh: {
  //               type: "Realtime",
  //               throttleSeconds: 1,
  //               intervalSeconds: 1,
  //             },
  //           },
  //         };
  //       } else if (type === "barchart") {
  //         extra = {
  //           parent_window_id: parentW.id,
  //         };
  //       }
  //       // const existingCharts = await windows.filter(cw => cw.parent_window_id === parentW.id);
  //       // if(existingCharts.length){
  //       //   // alert("Close existing chart before adding new one");
  //       // } else {

  //       //   const w = await addWindow({ name, type, ...extra }) as WindowData;
  //       // }
  //       const w =
  //         windows.find(
  //           (cw) => cw.type === type && cw.parent_window_id === parentW.id,
  //         ) ?? ((await addWindow({ name, type, ...extra })) as WindowData);
  //       await addLink({ w1_id: parentW.id, w2_id: w.id, linkOpts });
  //     };

  type ClickRowOpts =
    | { type: "table-row" }
    | { type: "timechart"; value: ActiveRow["timeChart"] }
    | { type: "barchart"; value: ActiveRow["barChart"] };
  const onClickRow = (
    rowOrFilter: AnyObject | undefined,
    table_name: string,
    wid: string,
    opts: ClickRowOpts,
  ) => {
    if (
      !rowOrFilter ||
      !table_name ||
      (this.state.active_row && this.state.active_row.window_id !== wid)
    ) {
      if (this.state.active_row) {
        this.setState({ active_row: undefined });
      }
      return;
    }

    let row_filter: AnyObject = {};
    const cols = tables.find((t) => t.name === table_name)?.columns ?? [];
    const pKeys = cols.filter((c) => c.is_pkey);

    if (opts.type === "timechart") {
      row_filter = { ...rowOrFilter };

      /**
       * Prefer pkey but if missing then use other non formated columns
       */
    } else if (pKeys.length && pKeys.every((pk) => pk.name in rowOrFilter)) {
      pKeys.map((pk) => {
        row_filter[pk.name] = rowOrFilter[pk.name];
      });
    } else if ("$rowhash" in rowOrFilter) {
      row_filter.$rowhash = rowOrFilter.$rowhash;
    } else {
      cols.map((c) => {
        if (
          c.tsDataType === "number" ||
          c.tsDataType === "string" ||
          c.is_pkey
        ) {
          row_filter[c.name] = rowOrFilter[c.name];
        }
      });
    }

    /* Must link to at least one other table */
    const rl_ids = links.filter(
      (l) =>
        [l.w1_id, l.w2_id].includes(wid) &&
        windows
          .filter((_w) => _w.id !== wid)
          .find((_w) => [l.w1_id, l.w2_id].includes(_w.id)),
    );

    let active_row: ActiveRow | undefined =
      !rl_ids.length ? undefined : (
        {
          window_id: wid,
          table_name: table_name,
          row_filter,
          timeChart: opts.type === "timechart" ? opts.value : undefined,
        }
      );

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
  };

  return {
    onClickRow,
    // onLinkTable,
  };
};
