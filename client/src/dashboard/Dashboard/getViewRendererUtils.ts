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
  { windows, links, tables }: Args,
) {
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
  };
};
