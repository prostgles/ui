import type {
  MultiSyncHandles,
  SingleSyncHandles,
} from "prostgles-client/dist/SyncedTable/SyncedTable";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { DBSchemaTable } from "prostgles-types";
import React from "react";
import Loading from "../../components/Loading";
import RTComp, { type DeltaOfData } from "../RTComp";
import { getSqlSuggestions } from "../SQLEditor/SQLEditorSuggestions";
import type { DBObject } from "../SearchAll";

import { mdiArrowLeft } from "@mdi/js";
import { isEmpty } from "prostgles-types";
import type { NavigateFunction } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import type { Prgl } from "../../App";
import { createReactiveState } from "../../App";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import { FlexCol, FlexRow } from "../../components/Flex";
import { TopControls } from "../../pages/TopControls";
import { DashboardMenu } from "../DashboardMenu/DashboardMenu";
import type { ActiveRow } from "../W_Table/W_Table";
import { getJoinedTables } from "../W_Table/tableUtils/tableUtils";
import type { LocalSettings } from "../localSettings";
import { useLocalSettings } from "../localSettings";
import { CloseSaveSQLPopup } from "./CloseSaveSQLPopup";
import { DashboardCenteredLayoutResizer } from "./DashboardCenteredLayoutResizer";
import type { ViewRendererProps } from "./ViewRenderer";
import { ViewRendererWrapped } from "./ViewRenderer";
import type {
  ChartType,
  DBSchemaTablesWJoins,
  LinkSyncItem,
  LoadedSuggestions,
  OnAddChart,
  WindowData,
  WindowSyncItem,
  Workspace,
  WorkspaceSchema,
  WorkspaceSyncItem,
} from "./dashboardUtils";
import { TopHeaderClassName } from "./dashboardUtils";
import { loadTable, type LoadTableArgs } from "./loadTable";
import { cloneWorkspace } from "./cloneWorkspace";
import { getWorkspacePath } from "../WorkspaceMenu/WorkspaceMenu";
import { API_PATH_SUFFIXES } from "../../../../commonTypes/utils";

const FORCED_REFRESH_PREFIX = "force-" as const;
export const CENTERED_WIDTH_CSS_VAR = "--centered-width";
export type DashboardProps = {
  prgl: Prgl;
  workspaceId?: string;
  localSettings: LocalSettings;
  onLoaded: VoidFunction;
  navigate: NavigateFunction;
};
export type DashboardState = {
  tables?: DBSchemaTablesWJoins;
  loading: boolean;
  minimised: boolean;
  namePopupWindow?: { w: WindowSyncItem; node: HTMLButtonElement };

  /* Updated after FileImport closes */
  imported?: number;

  suggestions?: LoadedSuggestions;

  db_objects?: DBObject[];

  wspError?: any;
  error?: any;
  reRender?: number;

  /**
   * If true then hide some dashboard controls (close window, minimize, window menus)
   */
  isReadonly?: boolean;
};
export type DashboardData = {
  links: LinkSyncItem[];
  linksSync?: any;
  closedWindows: WindowSyncItem[];
  allWindows: WindowSyncItem[];
  windows: WindowSyncItem[];
  windowsSync?: MultiSyncHandles<WindowData<ChartType>>;
  workspace?: WorkspaceSyncItem;
  workspaceSync?: SingleSyncHandles<Workspace>;
};

export class _Dashboard extends RTComp<
  DashboardProps,
  DashboardState,
  DashboardData
> {
  state: DashboardState = {
    loading: true,
    minimised: false,
    imported: 0,
  };
  d: DashboardData = {
    closedWindows: [],
    allWindows: [],
    windows: [],
    links: [],
    linksSync: null,
  };

  onUnmount() {
    const { workspaceSync, windowsSync, linksSync } = this.d;

    [workspaceSync, windowsSync, linksSync].map((s) => {
      if (s && s.unsync) s.unsync();
    });
  }

  loadingSchema: DashboardState["suggestions"];
  loadSchema = async (force = false): Promise<void> => {
    const { db, connectionId, tables: dbSchemaTables } = this.props.prgl;
    const workspace = this.d.workspace;
    const dbKey =
      force ? `${FORCED_REFRESH_PREFIX}${Date.now()}` : this.props.prgl.dbKey;
    if (
      workspace &&
      (this.loadingSchema?.dbKey !== dbKey || force) &&
      connectionId
    ) {
      this.loadingSchema = {
        dbKey,
        settingSuggestions: [],
        connectionId,
        suggestions: [],
        onRenew: () => this.loadSchema(true),
      };

      const { tables = [], error } = await getTables(
        dbSchemaTables,
        workspace,
        db,
      );

      const ns: Pick<
        DashboardState,
        "tables" | "suggestions" | "loading" | "error"
      > = {
        tables,
        loading: false,
        error,
        suggestions: undefined,
      };

      try {
        if (db.sql) {
          const { sql } = db;

          const suggestions = await getSqlSuggestions({ sql });
          const schema = {
            ...suggestions,
            connectionId,
            dbKey,
            searchAll: suggestions.suggestions.filter((s) =>
              ["table", "function"].includes(s.type),
            ) as any,
          };
          this.loadingSchema = { ...this.loadingSchema!, ...schema };
          ns.suggestions = { ...this.loadingSchema! };
        }
      } catch (e) {
        this.loadingSchema = undefined;
        console.error("Issue with getSuggestions:", e);
      }
      this.props.onLoaded();
      this.setState(ns);
    }
  };

  loadingTables = false;
  syncsSet = false;
  onDelta = async (
    dp: DashboardProps,
    ds: DashboardState,
    dd: DeltaOfData<DashboardData>,
  ) => {
    const delta = { ...dp, ...ds, ...dd };
    const {
      prgl: { connectionId, dbs },
      workspaceId,
    } = this.props;
    const { workspace } = this.d;
    const user_id = this.props.prgl.user?.id;
    let ns: Partial<DashboardState> = {};

    const workspaces = dbs.workspaces;
    if (workspaces.syncOne && !this.syncsSet && connectionId) {
      this.syncsSet = true;

      const wspFilter = { connection_id: connectionId, deleted: false };
      const wspCount = +(await workspaces.count(wspFilter));
      if (!wspCount) {
        const defaultIsDeleted = +(await workspaces.count({
          connection_id: connectionId,
          name: "default",
          deleted: true,
        }));

        const insertedWsp = await workspaces.insert(
          {
            connection_id: connectionId,
            name: !defaultIsDeleted ? "default" : `default ${Date.now()}`,
            ...({} as Pick<WorkspaceSchema, "user_id" | "last_updated">),
          },
          { returning: "*" },
        );
        console.log(insertedWsp);
      }
      let wsp: Workspace | undefined;
      try {
        wsp = (await workspaces.findOne(
          workspaceId ? { id: workspaceId, ...wspFilter } : wspFilter,
          { orderBy: { last_used: -1 } },
        )) as Workspace;

        await cloneEditableWorkpsaces({ dbs, user_id });

        /** If this is an editable workspace then ensure we're working on a clone */
        if (
          wsp.published &&
          wsp.user_id !== this.props.prgl.user?.id &&
          wsp.publish_mode !== "fixed"
        ) {
          let myClonedWsp = await workspaces.findOne({
            parent_workspace_id: wsp.id,
          });
          if (!myClonedWsp) {
            myClonedWsp = (await cloneWorkspace(dbs, wsp.id, true)).clonedWsp;
          }
          if (wsp.id !== myClonedWsp.id) {
            window.location.href = getWorkspacePath(myClonedWsp);
          }
          wsp = myClonedWsp;
        }
      } catch (e) {
        this.setState({ wspError: e });
        return;
      }

      if (!wsp as any) {
        this.setState({ wspError: true });
        return;
      }

      const validatedCols = await this.props.prgl.dbs.workspaces
        .getColumns("en", {
          rule: "update",
          filter: { id: wsp.id },
        })
        .catch((error) => {
          console.error(error);
          return [];
        });

      const isReadonly = validatedCols.every((c) => !c.update);
      this.setState({
        isReadonly,
      });
      const { connection } = this.props.prgl;
      window.document.title = `Prostgles UI - ${connection.name || connection.db_host}`;

      let updatedLastUsed = false;
      const workspaceSync = await workspaces.syncOne(
        { id: wsp.id, deleted: false },
        { handlesOnData: true },
        (workspace, delta) => {
          if (!this.mounted) return;
          if (!updatedLastUsed) {
            updatedLastUsed = true;
            workspace.$update?.({ last_used: new Date() as any });
          }
          this.setData({ workspace }, { workspace: delta });
        },
      );

      const linksSync = await dbs.links.sync?.(
        { workspace_id: wsp.id },
        { handlesOnData: true },
        (links, delta) => {
          if (!this.mounted) return;

          this.setData({ links: links as any }, { links: delta as any });
        },
      );

      const windowsSync = await dbs.windows.sync?.(
        { workspace_id: wsp.id },
        { handlesOnData: true, select: "*", patchText: false },
        (_wnds, deltas) => {
          const wnds: WindowSyncItem[] = _wnds as any;
          if (!this.mounted) return;

          const windows = wnds.sort(
            (a, b) => +a.last_updated - +b.last_updated,
          );
          const closedWindows = windows.filter(
            (w) => w.closed && !w.table_name && w.name,
          );
          const openWindows = windows.filter((w) => !w.closed);

          /** Dashboard only re-renders on window ids or names change OR linked windows filters change
           * Maybe ....
           */
          const stringOpts = (w: WindowSyncItem) =>
            `${w.id} ${w.type} ${w.fullscreen} ${JSON.stringify(w.filter)} ${JSON.stringify(w.having)} ${w.parent_window_id} ${w.minimised} ${w.created}`; // ${JSON.stringify((w as any).options?.extent ?? {})}
          if (
            this.d.windows.map(stringOpts).sort().join() ===
            openWindows.map(stringOpts).sort().join()
          ) {
            return;
          }
          this.setData(
            { allWindows: windows, windows: openWindows, closedWindows },
            { windows: deltas as any },
          );
        },
      );
      this.setData(
        { windowsSync, workspaceSync, linksSync },
        { windowsSync, workspaceSync, linksSync },
      );
    }

    this.checkIfNoOpenWindows();

    const needToRecalculateCounts =
      "workspace" in delta &&
      ((delta.workspace && "hideCounts" in delta.workspace) ||
        delta.workspace?.options?.tableListEndInfo ||
        delta.workspace?.options?.tableListSortBy);
    const schemaChanged = this.props.prgl.dbKey !== this.loadingSchema?.dbKey; //  !this.loadingSchema?.dbKey.startsWith(FORCED_REFRESH_PREFIX) &&
    const dataWasImported = !!delta.imported;
    if (
      workspace &&
      (schemaChanged || needToRecalculateCounts || dataWasImported)
    ) {
      this.loadSchema();
    }

    if (dd) {
      ["windows", "workspace", "links"].map((key) => {
        if (dd[key]) ns[key] = { ...dd[key] };
      });
      if (isEmpty(ns) && dd.windowsSync) {
        ns = { reRender: Date.now() };
      }
    }
    if (!isEmpty(ns)) {
      this.setState(ns as any);
    }
  };

  loadTable = async (
    args: Omit<LoadTableArgs, "db" | "dbs" | "workspace_id">,
  ): Promise<string> => {
    const { db, dbs } = this.props.prgl;
    const { workspace } = this.d;
    if (!workspace) throw new Error("Workspace not found");
    return loadTable({ ...args, db, dbs, workspace_id: workspace.id });
  };

  checkedIfNoOpenWindows = false;
  checkIfNoOpenWindows = async () => {
    const {
      workspaceId,
      prgl: { dbs },
    } = this.props;
    if (workspaceId) {
      this.checkedIfNoOpenWindows = true;
      const hasOpenWindows = await dbs.windows.findOne({
        workspace_id: workspaceId,
        closed: false,
      });
      if (!hasOpenWindows) {
        const menuBtn = document.querySelector<HTMLButtonElement>(
          `[data-command="menu"]`,
        );
        menuBtn?.click();
      }
    }
  };

  /**
   * Used to reduce useless re-renders
   */
  menuAnchorState = createReactiveState<HTMLElement | undefined>(undefined);

  isOk = false;
  render() {
    const { localSettings, prgl } = this.props;
    const { connectionId } = prgl;
    const {
      tables,
      loading,
      isReadonly,
      suggestions,
      wspError,
      error,
      namePopupWindow,
    } = this.state;

    const { centeredLayout } = localSettings;

    if (wspError || error) {
      const errorNode =
        wspError ?
          <FlexCol className="w-full h-full ai-center text-0 pt-2">
            Workspace not found
            <Btn
              color="action"
              variant="filled"
              asNavLink={true}
              href={`${API_PATH_SUFFIXES.DASHBOARD}/${connectionId}`}
              iconPath={mdiArrowLeft}
            >
              Go back
            </Btn>
          </FlexCol>
        : <ErrorComponent error={error} />;
      return <div className="flex-col p-1 text-white">{errorNode}</div>;
    }

    const { windowsSync, workspace } = this.d;

    let mainContent: React.ReactNode;

    if (!windowsSync || !workspace || !tables) {
      let loadingMessage = "";
      if (!windowsSync || !workspace) {
        loadingMessage = "Loading dashboard...";
      } else if (!tables) {
        loadingMessage = "Loading schema...";
      }

      return (
        <div className="absolute flex-row bg-color-0 " style={{ inset: 0 }}>
          <Loading
            id="main"
            message={loadingMessage}
            className="m-auto"
            refreshPageTimeout={5000}
          />
        </div>
      );
    }

    if (connectionId) {
      mainContent = (
        <ViewRendererWrapped
          /** Do not re-render on dbKey change because it breaks sql editor */
          // key={prgl.dbKey}
          isReadonly={isReadonly}
          prgl={prgl}
          workspace={workspace}
          loadTable={this.loadTable}
          links={this.d.links}
          windows={this.d.windows}
          tables={tables}
          onCloseUnsavedSQL={(q, e) => {
            this.setState({ namePopupWindow: { w: q, node: e.currentTarget } });
          }}
          suggestions={suggestions}
        />
      );
    }

    this.isOk = true;

    const pinnedMenu = getIsPinnedMenu(workspace);
    const isReadonlyWorkspace =
      workspace.published && workspace.user_id !== prgl.user?.id;
    const isFixed = isReadonlyWorkspace && workspace.publish_mode === "fixed";
    const dashboardMenu = (
      <DashboardMenu
        menuAnchorState={this.menuAnchorState}
        prgl={prgl}
        suggestions={suggestions}
        loadTable={this.loadTable}
        tables={tables}
        workspace={workspace}
      />
    );
    const pinnedDashboardMenu = pinnedMenu ? dashboardMenu : null;
    const popupDashboardMenu = pinnedDashboardMenu ? null : dashboardMenu;

    const getCenteredEdgeStyle = (): React.CSSProperties | undefined =>
      !centeredLayout?.enabled ?
        undefined
      : {
          flex: pinnedDashboardMenu ? 0.5 : 0,
          minWidth: pinnedDashboardMenu ? "200px" : 0,
          width:
            workspace.options.pinnedMenuWidth ?
              `${workspace.options.pinnedMenuWidth}px`
            : "auto",
          maxWidth: `calc((100% - var(${CENTERED_WIDTH_CSS_VAR}))/2)`,
          overflow: "hidden",
          display: "flex",
        };

    const centeredWidth =
      !centeredLayout?.enabled ? undefined : `var(${CENTERED_WIDTH_CSS_VAR})`;
    const centerStyle: React.CSSProperties | undefined =
      !centeredWidth ? undefined : (
        {
          flex: 1000,
          minWidth: 0,
          width: centeredWidth,
          maxWidth: centeredWidth,
          margin: "0 auto",
        }
      );

    return (
      <FlexCol
        className={"Dashboard gap-0 f-1 min-w-0 min-h-0 w-full "}
        style={{
          maxWidth: "100vw",
          opacity: connectionId ? 1 : 0,
          transition: "opacity .5s",
          ...(centeredLayout?.enabled && {
            [CENTERED_WIDTH_CSS_VAR]: `${centeredLayout.maxWidth}px`,
          }),
        }}
      >
        <div
          className={`${TopHeaderClassName} f-0 flex-row  min-h-0 min-w-0 o-hidden`}
        >
          <>{popupDashboardMenu}</>
          <TopControls
            onClick={(e) => {
              this.menuAnchorState.set(e.currentTarget);
            }}
            location="workspace"
            pinned={pinnedMenu}
            prgl={this.props.prgl}
            workspace={workspace}
          />
        </div>

        <CloseSaveSQLPopup
          namePopupWindow={namePopupWindow}
          onClose={() => this.setState({ namePopupWindow: undefined })}
          windows={this.d.windows}
        />

        <div
          className="Dashboard_Wrapper min-h-0 f-1 flex-row relative"
          style={{
            gap: "1px",
            marginTop: "2px",
          }}
        >
          <div style={getCenteredEdgeStyle()}>{pinnedDashboardMenu}</div>

          <FlexRow
            style={centerStyle}
            className="Dashboard_MainContentWrapper f-1 gap-0 relative ai-none jc-none"
          >
            <DashboardCenteredLayoutResizer />
            {mainContent}
          </FlexRow>

          <div
            style={{
              ...getCenteredEdgeStyle(),
              /** Ensure right section shrinks to 0 if the left dashboard menu is pinned and we have a centered layout */
              ...(!!pinnedDashboardMenu && { minWidth: 0 }),
            }}
          ></div>
        </div>

        {loading ?
          <Loading className="p-2" />
        : null}
      </FlexCol>
    );
  }
}

export const Dashboard = (
  p: Omit<DashboardProps, "localSettings" | "navigate">,
) => {
  const localSettings = useLocalSettings();
  const navigate = useNavigate();
  return (
    <_Dashboard {...p} localSettings={localSettings} navigate={navigate} />
  );
};

export type CommonWindowProps<T extends ChartType = ChartType> = Pick<
  DashboardProps,
  "prgl"
> & {
  key: string;
  "data-key": string;
  "data-table-name": string | null;
  "data-title": string;
  w: WindowSyncItem<T>;
  childWindows: WindowSyncItem[];
  getLinksAndWindows: () => {
    links: LinkSyncItem[];
    windows: WindowSyncItem<ChartType>[];
  };
  /**
   * e is undefined when the table window was closed due to dropped table
   */
  onClose: (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent> | undefined,
  ) => any;
  /**
   * used to force re-render after links changed
   */
  onForceUpdate: () => void;
  titleIcon?: React.ReactNode;
  tables: Required<DashboardState>["tables"];
  isReadonly: boolean;
  suggestions: LoadedSuggestions | undefined;
  myLinks: LinkSyncItem[];
  onAddChart: OnAddChart | undefined;
  active_row: ActiveRow | undefined;
} & Pick<ViewRendererProps, "searchParams" | "setSearchParams">;

export const getTables = async (
  schemaTables: DBSchemaTable[],
  workspace: WorkspaceSyncItem | undefined,
  db: DBHandlerClient,
): Promise<
  | { tables: DBSchemaTablesWJoins; error?: undefined }
  | { error: any; tables?: undefined }
> => {
  try {
    const tables = await Promise.all(
      schemaTables.map(async (t) => {
        // const countRequestedAndAllowed = workspace?.options.tableListEndInfo === "count" && db[t.name]?.count;
        // const tableHasColumnsAndWillNotError = !!t.columns.length;
        // const shouldGetCount = countRequestedAndAllowed && tableHasColumnsAndWillNotError;
        // const count = (shouldGetCount? await db[t.name]?.count?.() ?? "" : "").toString();
        return {
          ...t,
          // count,
          ...getJoinedTables(schemaTables, t.name, db),
        };
      }),
    ).catch((e) => {
      console.error(e);
      throw e;
    });
    return { tables };
  } catch (error: any) {
    console.error(error);
    return {
      error,
    };
  }
};

export const getIsPinnedMenu = (workspace: WorkspaceSyncItem) => {
  return workspace.options.pinnedMenu && !window.isLowWidthScreen;
};

const cloneEditableWorkpsaces = async ({
  dbs,
  user_id,
}: {
  dbs: Prgl["dbs"];
  user_id: string | undefined;
}) => {
  /** Clone published editable workspaces */
  const editablePublished =
    !user_id ?
      []
    : await dbs.workspaces.find({
        published: true,
        user_id: { $ne: user_id! },
        publish_mode: { $isDistinctFrom: "fixed" },
        $notExistsJoined: {
          workspaces: {
            user_id,
          },
        },
      });
  await Promise.all(
    editablePublished.map(async (wsp) => {
      return cloneWorkspace(dbs, wsp.id, true);
    }),
  );
};
