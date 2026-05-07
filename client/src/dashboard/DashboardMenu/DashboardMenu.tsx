import Popup from "@components/Popup/Popup";
import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import { includes } from "prostgles-types";
import React, { useCallback, useMemo } from "react";
import type { ReactiveState } from "../../appUtils";
import { useReactiveState } from "../../appUtils";
import type {
  CommonWindowProps,
  DashboardProps,
  DashboardState,
} from "../Dashboard/Dashboard";
import type { WindowData, Workspace } from "../Dashboard/dashboardUtils";
import { useAddViewToWorkspace } from "../Dashboard/useAddViewToWorkspace";
import type { SEARCH_TYPES } from "../SearchAll/SearchAll";
import { SearchAll } from "../SearchAll/SearchAll";
import { DashboardMenuContent } from "./DashboardMenuContent";
import { DashboardMenuHeader } from "./DashboardMenuHeader";
import { DashboardMenuHotkeys } from "./DashboardMenuHotkeys";

export type DashboardMenuProps = Pick<DashboardProps, "prgl"> & {
  suggestions: DashboardState["suggestions"];
  tables: CommonWindowProps["tables"];
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
  const { suggestions, tables, workspace, prgl } = props;
  const { db, dbs, sql, methods } = prgl;

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
  const { addViewToWorkspace } = useAddViewToWorkspace();
  if (!(dbs as any).workspaces.insert) return hotKeys;

  const pinnedMenu = workspace.options.pinnedMenu && !window.isLowWidthScreen;
  if (!pinnedMenu && !anchor.node && !showSearchAll) return hotKeys;
  const isReadonlyWorkspace =
    workspace.published && workspace.user_id !== prgl.user?.id;
  const isFixed = isReadonlyWorkspace && workspace.layout_mode === "fixed";

  return (
    <>
      {showSearchAll && (
        <SearchAll
          db={db}
          sql={sql}
          methods={methods}
          tables={tables}
          searchType={showSearchAll.mode}
          defaultTerm={showSearchAll.term}
          suggestions={suggestions?.suggestions}
          queries={queries}
          onOpenDBObject={(s, method_name) => {
            if (method_name) {
              void addViewToWorkspace({
                workspace_id: workspace.id,
                type: "method",
                method_name,
              });
            } else if (!s) {
            } else if (s.type === "function") {
              void addViewToWorkspace({
                workspace_id: workspace.id,
                type: "sql",
                sql: s.definition,
                name: s.name,
              });
            } else if (includes(["table", "view", "mview"], s.type)) {
              if (db[s.name]) {
                void addViewToWorkspace({
                  workspace_id: workspace.id,
                  type: "table",
                  table: s.name,
                  name: s.name,
                });
              } else {
                void addViewToWorkspace({
                  workspace_id: workspace.id,
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
            void addViewToWorkspace({
              workspace_id: workspace.id,
              type: "table",
              table,
              filter,
            });
          }}
          onClose={() => {
            setShowSearchAll(undefined);
          }}
        />
      )}
      {hotKeys}
      {isFixed ?
        null
      : pinnedMenu ?
        <DashboardMenuContent
          {...props}
          queries={queries}
          onClickSearchAll={onClickSearchAll}
          onClose={undefined}
        />
      : anchor.node ?
        <Popup
          key="main menu"
          data-command="DashboardMenu"
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
        >
          <DashboardMenuContent
            {...props}
            queries={queries}
            onClickSearchAll={onClickSearchAll}
            onClose={anchor.onClose}
          />
        </Popup>
      : null}
    </>
  );
};
