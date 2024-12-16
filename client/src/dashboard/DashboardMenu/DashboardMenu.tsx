import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import React, { useCallback, useMemo } from "react";
import type { ReactiveState } from "../../appUtils";
import { useReactiveState } from "../../appUtils";
import Popup from "../../components/Popup/Popup";
import type {
  CommonWindowProps,
  DashboardProps,
  DashboardState,
  _Dashboard,
} from "../Dashboard/Dashboard";
import type { WindowData, Workspace } from "../Dashboard/dashboardUtils";
import type { SEARCH_TYPES } from "../SearchAll";
import { SearchAll } from "../SearchAll";
import { DashboardMenuContent } from "./DashboardMenuContent";
import { DashboardMenuHeader } from "./DashboardMenuHeader";
import { DashboardMenuHotkeys } from "./DashboardMenuHotkeys";
import { useTableSizeInfo } from "./useTableSizeInfo";

export type DashboardMenuProps = Pick<DashboardProps, "prgl"> & {
  suggestions: DashboardState["suggestions"];
  tables: CommonWindowProps["tables"];
  loadTable: _Dashboard["loadTable"];
  workspace: SyncDataItem<Workspace, true>;
};

export type DashboardMenuState = {
  showSearchAll?: {
    mode: (typeof SEARCH_TYPES)[number]["key"];
    term?: string;
  };
  queries: SyncDataItem<WindowData<"sql">>[];
};

export const DashboardMenu = ({
  menuAnchorState,
  ...props
}: Omit<DashboardMenuProps, "localSettings" | "anchor"> & {
  menuAnchorState: ReactiveState<HTMLElement | undefined>;
}) => {
  const { state: menuAnchor, setState } = useReactiveState(menuAnchorState);

  const [showSearchAll, setShowSearchAll] =
    React.useState<DashboardMenuState["showSearchAll"]>();
  const { suggestions, tables, loadTable, workspace, prgl } = props;
  const { db, dbs } = prgl;

  const filter =
    workspace.options.showAllMyQueries ? {} : { workspace_id: workspace.id };
  const { data: windows } = dbs.windows.useSync!(filter, {
    handlesOnData: true,
    select: "*",
    patchText: false,
  });
  const queries = useMemo(() => {
    return (windows?.filter((w) => w.type === "sql" && !w.deleted) ??
      []) as SyncDataItem<WindowData<"sql">>[];
  }, [windows]);
  const anchor = { node: menuAnchor, onClose: () => setState(undefined) };
  const { tablesWithInfo } = useTableSizeInfo({ tables, db, workspace });

  const onClickSearchAll = useCallback(() => {
    setShowSearchAll({
      mode: "views and queries",
      term: undefined,
    });
  }, []);
  const hotKeys = (
    <>
      <DashboardMenuHotkeys {...props} setShowSearchAll={setShowSearchAll} />
    </>
  );
  if (!(dbs as any).workspaces.insert) return hotKeys;

  const pinnedMenu = workspace.options.pinnedMenu && !window.isLowWidthScreen;
  if (!pinnedMenu && !anchor.node && !showSearchAll) return hotKeys;
  const isReadonlyWorkspace =
    workspace.published && workspace.user_id !== prgl.user?.id;
  const isFixed = isReadonlyWorkspace && workspace.publish_mode === "fixed";
  const mainContent =
    isFixed ? null
    : pinnedMenu ?
      <DashboardMenuContent
        {...props}
        queries={queries}
        onClickSearchAll={onClickSearchAll}
        tablesWithInfo={tablesWithInfo}
        onClose={undefined}
      />
    : anchor.node ?
      <Popup
        key="main menu"
        showFullscreenToggle={{}}
        title={
          <DashboardMenuHeader
            {...props}
            onClickSearchAll={onClickSearchAll}
            onClose={anchor.onClose}
          />
        }
        onClickClose={false}
        onClose={anchor.onClose}
        positioning="beneath-left"
        anchorEl={anchor.node}
        clickCatchStyle={{
          backdropFilter: "blur(1px)",
          background: "rgba(var(--text-color-0), 0.11)",
          opacity: 1,
        }}
        contentStyle={{
          overflow: "hidden",
          padding: 0,
        }}
        autoFocusFirst={
          isReadonlyWorkspace ? undefined : (
            {
              selector: `.search-list-tables input`,
            }
          )
        }
      >
        <DashboardMenuContent
          {...props}
          queries={queries}
          tablesWithInfo={tablesWithInfo}
          onClickSearchAll={onClickSearchAll}
          onClose={anchor.onClose}
        />
      </Popup>
    : null;

  return (
    <>
      {showSearchAll && (
        <SearchAll
          db={db}
          methods={props.prgl.methods}
          tables={tables}
          searchType={showSearchAll.mode}
          defaultTerm={showSearchAll.term}
          suggestions={suggestions?.searchAll}
          queries={queries}
          loadTable={loadTable}
          onOpenDBObject={(s, method_name) => {
            if (method_name) {
              loadTable({ type: "method", method_name });
            } else if (!s) {
            } else if (s.type === "function") {
              loadTable({ type: "sql", sql: s.definition, name: s.name });
            } else if ((s as any).type === "table") {
              if (db[s.name]) {
                loadTable({ type: "table", table: s.name, name: s.name });
              } else {
                loadTable({
                  type: "sql",
                  sql: `SELECT *\nFROM ${s.escapedIdentifier}\nLIMIT 25`,
                  name: s.name,
                });
              }
            } else {
              throw s;
            }
          }}
          onOpen={({ filter, table }) => {
            loadTable({ type: "table", table, filter });
          }}
          onClose={() => {
            setShowSearchAll(undefined);
          }}
        />
      )}
      {hotKeys}
      {mainContent}
    </>
  );
};
