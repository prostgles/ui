import Popup from "@components/Popup/Popup";
import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import { includes } from "prostgles-types";
import React, { useEffect, useMemo } from "react";
import type { ReactiveState } from "../../appUtils";
import { useReactiveState } from "../../appUtils";
import type { DashboardProps, DashboardState } from "../Dashboard/Dashboard";
import type { Workspace } from "../Dashboard/dashboardUtils";
import type { WindowData } from "@common/ColumnConfig/WindowData";
import { useAddViewToWorkspace } from "../Dashboard/useAddViewToWorkspace";
import { commandPaletteStore } from "src/app/CommandPalette/commandPaletteStore";
import { DashboardMenuContent } from "./DashboardMenuContent";
import { DashboardMenuHotkeys } from "./DashboardMenuHotkeys";
import { getIsPinnedMenu } from "../Dashboard/Dashboard";

export type DashboardMenuProps = Pick<DashboardProps, "prgl"> & {
  suggestions: DashboardState["suggestions"];
  workspace: SyncDataItem<Workspace, { handlesOnData: true }>;
};

export type DashboardMenuState = {
  queries: SyncDataItem<WindowData<"sql">, { handlesOnData: true }>[];
};

export const DashboardMenu = ({
  menuAnchorState,
  ...props
}: Omit<DashboardMenuProps, "localSettings" | "anchor"> & {
  menuAnchorState: ReactiveState<HTMLElement | undefined>;
}) => {
  const { state: menuAnchor, setState } = useReactiveState(menuAnchorState);

  const { suggestions, workspace, prgl } = props;
  const { tables, db, dbs, sql, methods } = prgl;

  const filter =
    workspace.options.showAllMyQueries ? {} : { workspace_id: workspace.id };
  const { data: windows } = dbs.windows.useSync!(filter, {
    handlesOnData: true,
    select: "*",
  });
  const queries = useMemo(() => {
    return (windows?.filter((w) => w.type === "sql" && !w.deleted) ??
      []) as SyncDataItem<WindowData<"sql">, { handlesOnData: true }>[];
  }, [windows]);
  const anchor = { node: menuAnchor, onClose: () => setState(undefined) };

  const hotKeys = (
    <>
      <DashboardMenuHotkeys workspace={workspace} />
    </>
  );
  const { addViewToWorkspace } = useAddViewToWorkspace();

  useEffect(() => {
    commandPaletteStore.setState({
      searchAllProps: {
        db,
        sql,
        methods,
        tables,
        suggestions: suggestions?.suggestions,
        queries,
        onOpenDBObject: (s, method_name) => {
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
        },
        onOpen: ({ filter, table }) => {
          void addViewToWorkspace({
            workspace_id: workspace.id,
            type: "table",
            table,
            filter,
          });
        },
      },
    });
    return () => {
      commandPaletteStore.setState({ searchAllProps: undefined });
    };
  }, [
    db,
    sql,
    methods,
    tables,
    suggestions,
    queries,
    workspace.id,
    addViewToWorkspace,
  ]);

  const pinnedMenu = getIsPinnedMenu(prgl.user);
  if (!pinnedMenu && !anchor.node) return hotKeys;

  return (
    <>
      {hotKeys}
      {pinnedMenu ?
        <DashboardMenuContent
          {...props}
          queries={queries}
          onClose={undefined}
        />
      : anchor.node ?
        <Popup
          key="main menu"
          data-command="DashboardMenu"
          showFullscreenToggle={{}}
          title="Menu"
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
            onClose={anchor.onClose}
          />
        </Popup>
      : null}
    </>
  );
};
