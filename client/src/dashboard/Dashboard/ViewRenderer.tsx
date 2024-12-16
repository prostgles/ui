import { isDefined } from "prostgles-types";
import React from "react";
import { useSearchParams } from "react-router-dom";
import { ErrorTrap } from "../../components/ErrorComponent";
import { FlexCol } from "../../components/Flex";
import { DashboardHotkeys } from "../DashboardMenu/DashboardHotkeys";
import { LinkMenu } from "../LinkMenu";
import RTComp from "../RTComp";
import type { SilverGridProps } from "../SilverGrid/SilverGrid";
import { SilverGridReact } from "../SilverGrid/SilverGrid";
import W_Map from "../W_Map/W_Map";
import {
  getLinkColorV2,
  getMapLayerQueries,
} from "../W_Map/getMapLayerQueries";
import { W_Method } from "../W_Method/W_Method";
import { SQL_SNIPPETS } from "../W_SQL/SQLSnippets";
import { W_SQL } from "../W_SQL/W_SQL";
import type { ActiveRow } from "../W_Table/W_Table";
import W_Table from "../W_Table/W_Table";
import { W_TimeChart } from "../W_TimeChart/W_TimeChart";
import { default as WNDOW } from "../Window";
import { getCrossFilters } from "../joinUtils";
import type { LocalSettings } from "../localSettings";
import { useLocalSettings } from "../localSettings";
import { findShortestPath, makeReversibleGraph } from "../shortestPath";
import type {
  CommonWindowProps,
  DashboardData,
  DashboardProps,
  DashboardState,
  _Dashboard,
} from "./Dashboard";
import type {
  ChartType,
  Link,
  WindowData,
  WindowSyncItem,
} from "./dashboardUtils";
import { getViewRendererUtils } from "./getViewRendererUtils";

export type ViewRendererProps = Pick<DashboardProps, "prgl"> &
  Pick<DashboardData, "workspace" | "links" | "windows"> &
  Pick<DashboardState, "tables" | "suggestions" | "isReadonly"> & {
    loadTable: _Dashboard["loadTable"];
    onCloseUnsavedSQL: (
      q: WindowSyncItem<ChartType>,
      e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    ) => any;
    localSettings: LocalSettings;
    searchParams: URLSearchParams;
    setSearchParams: ReturnType<typeof useSearchParams>[1];
  };
type ViewRendererState = {
  active_row?: ActiveRow;
  linkMenuWindow?: {
    w: WindowSyncItem;
    anchorEl: HTMLElement | Element;
  };
};

type D = {
  links: Link[];
  windows: WindowData[];
};
export class ViewRenderer extends RTComp<
  ViewRendererProps,
  ViewRendererState,
  D
> {
  state: ViewRendererState = {};
  gridRef?: HTMLDivElement;
  gridWrapperRef?: HTMLDivElement;

  getLinkChain(w1_id: string, w2_id: string): string[] | undefined {
    const { links = [] } = this.d;
    const graph = makeReversibleGraph(links.map((l) => [l.w1_id, l.w2_id]));
    const path = findShortestPath(graph, w1_id, w2_id);
    return path.distance < Infinity ? path.path : undefined;
  }

  getTableChain = (w1_id: string, w2_id: string): string[] | undefined => {
    const path = this.getLinkChain(w1_id, w2_id);
    if (path) {
      const { windows } = this.props;
      const tableChain = path.map((wid) => {
        return windows.find((w) => w.id === wid)?.table_name;
      });
      if (tableChain.every(isDefined)) {
        return tableChain as string[];
      }
    }
    return undefined;
  };

  getOpenedLinksAndWindows() {
    const windows = this.props.windows.filter((w) => !w.deleted && !w.closed);
    const links = this.props.links.filter(
      (l) =>
        !l.closed &&
        !l.deleted &&
        [l.w1_id, l.w2_id].every((wid) => windows.some((w) => w.id === wid)),
    );

    return { links, windows };
  }

  render() {
    const {
      workspace,
      tables,
      suggestions,
      isReadonly,
      searchParams,
      setSearchParams,
      prgl,
    } = this.props;
    const { links, windows } = this.getOpenedLinksAndWindows();
    const { linkMenuWindow } = this.state;

    if (!workspace || !tables) return;

    const { onClickRow, onAddChart, onLinkTable } = getViewRendererUtils.bind(
      this,
    )({ ...this.props, windows, links, workspace, tables });

    const getRenderedWindow = (
      w: WindowSyncItem,
      childWindow: React.ReactNode | null,
      childWindows: WindowSyncItem[],
    ) => {
      const onClose: CommonWindowProps["onClose"] = async (e) => {
        if (!e) return;
        w = w.$get() as WindowSyncItem;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!w.$get) {
          console.error(this.d.windows);
        }
        this.setState({ active_row: undefined });

        if (w.type === "sql" && (w as WindowData<"sql">).options?.sqlWasSaved) {
          await w.$update({ closed: true });
        } else if (
          w.sql.trim().length &&
          w.type === "sql" &&
          !(w as WindowData<"sql">).options?.sqlWasSaved
        ) {
          if (SQL_SNIPPETS.some((s) => s.sql.trim() === w.sql.trim())) {
            await w.$update({ closed: true, deleted: true });
          } else {
            this.props.onCloseUnsavedSQL(w, e);
          }

          /** Is table or chart. Delete permanently */
        } else {
          await w.$update({ closed: true, deleted: true });

          /* This does not work because the server query adds the filter which now 
          // await dbs.windows.update({ id: q.id }, { closed: true });
          */

          await this.props.prgl.dbs.links.update(
            { $or: [{ w1_id: w.id }, { w2_id: w.id }] },
            { closed: true, deleted: true },
          );
        }
      };

      const onForceUpdate = () => {
        const { links, windows } = this.getOpenedLinksAndWindows();
        const haveActiveLinks = links.some((l) =>
          windows.find(
            (otherWindow) =>
              !otherWindow.closed &&
              otherWindow.id !== w.id &&
              [l.w1_id, l.w2_id].sort().join() ===
                [w.id, otherWindow.id].sort().join(),
          ),
        );
        if (haveActiveLinks) {
          setTimeout(() => this.forceUpdate(), 1);
        }
      };

      const { links, windows } = this.getOpenedLinksAndWindows();
      const myLinks = links.filter((l) => [l.w1_id, l.w2_id].includes(w.id));

      const key = w.id + w.fullscreen;

      const commonProps: CommonWindowProps = {
        key,
        "data-key": w.id,
        "data-table-name": w.table_name,
        "data-title": WNDOW.getTitle(w),
        w,
        childWindows,
        prgl: this.props.prgl,
        tables,
        onClose,
        onForceUpdate,
        searchParams,
        setSearchParams,
        suggestions,
        isReadonly: !!isReadonly,
        myLinks,
        active_row: this.state.active_row,
        getLinksAndWindows: () => this.getOpenedLinksAndWindows(),
        onAddChart: !onAddChart ? undefined : (args) => onAddChart(args, w),
      };
      const setLinkMenu =
        isReadonly ? undefined : (
          (linkMenuWindow) => this.setState({ linkMenuWindow })
        );

      let result: Required<SilverGridProps>["children"][number] | null = null;
      const linkIcon = null;

      if (w.type === "method") {
        result = <W_Method {...commonProps} w={w} />;
      } else if (w.type === "sql") {
        result = (
          <W_SQL
            titleIcon={linkIcon}
            setLinkMenu={setLinkMenu}
            {...commonProps}
            childWindow={childWindow}
            w={w}
          />
        );
      } else {
        const { colorStr } = getLinkColorV2(
          myLinks.find((l) => l.options.type !== "table"),
          0.1,
        );
        const active_row = this.state.active_row;

        if (w.type === "map") {
          const { active_row } = this.state;

          const layerQueries = getMapLayerQueries({
            active_row,
            links,
            myLinks,
            windows,
            w,
          });

          result = (
            <W_Map
              myActiveRow={
                active_row?.window_id === w.id ? active_row : undefined
              }
              onClickRow={(row, table_name) => {
                onClickRow(row, table_name, w.id, { type: "table-row" });
              }}
              titleIcon={linkIcon}
              layerQueries={layerQueries}
              {...commonProps}
              w={w}
            />
          );
        } else if (w.type === "timechart") {
          result = (
            <W_TimeChart
              {...commonProps}
              activeRowColor={colorStr}
              myActiveRow={
                active_row?.window_id === w.id ? active_row : undefined
              }
              onClickRow={(row, tableName, value) => {
                onClickRow(row, tableName, w.id, { type: "timechart", value });
              }}
              w={w}
            />
          );
        } else {
          const crossF = getCrossFilters(
            w as WindowSyncItem<"table">,
            active_row,
            links,
            windows,
          );

          result = (
            <W_Table
              workspace={workspace}
              setLinkMenu={setLinkMenu}
              activeRowColor={colorStr}
              activeRow={
                active_row?.window_id === w.id ? active_row : undefined
              }
              onLinkTable={
                this.props.isReadonly ?
                  undefined
                : async (tblName, path) => {
                    onLinkTable(w, tblName, path);
                  }
              }
              joinFilter={crossF.activeRowFilter}
              externalFilters={crossF.all}
              onClickRow={(row) =>
                onClickRow(row, w.table_name!, w.id, { type: "table-row" })
              }
              childWindow={childWindow}
              {...commonProps}
              key={commonProps.key + this.props.prgl.dbKey}
              w={w as any}
            />
          );
        }
      }

      const res = {
        id: w.id,
        title: w.name || w.table_name || w.id,
        linkIcon,
        onClose: isReadonly ? undefined : onClose,
        q: w,
        elem: result,
      };

      return res;
    };

    const parentWindows = windows.filter((w) => !w.parent_window_id);
    const renderedWindows = parentWindows
      .map((w) => {
        const latestChildWindows = windows
          .filter((cw) => cw.parent_window_id === w.id)
          .sort(
            (b, a) =>
              new Date(a.created).getTime() - new Date(b.created).getTime(),
          );
        // .sort((b,a) => Number(a.last_updated) - Number(b.last_updated));
        const latestChildWindow = latestChildWindows.find(
          (cw) => !cw.minimised,
        );

        const renderedChildNode =
          latestChildWindow &&
          getRenderedWindow(latestChildWindow, undefined, []).elem;
        return getRenderedWindow(w, renderedChildNode, latestChildWindows);
      })
      .filter(isDefined);

    return (
      <div
        className="ViewRenderer min-h-0 f-1 flex-row relative"
        ref={(r) => {
          if (r) this.gridWrapperRef = r;
        }}
      >
        {!renderedWindows.length && (
          <FlexCol
            className="absolute inset-0 jc-center ai-center"
            style={{
              opacity: prgl.theme === "light" ? 1 : 0.5,
              background:
                prgl.theme === "light" ? "var(--gray-100)" : "var(--gray-800)",
            }}
          >
            <DashboardHotkeys
              style={{
                color: prgl.theme === "light" ? "var(--gray-400)" : "white",
              }}
              keyStyle={{
                background:
                  prgl.theme === "light" ? "var(--gray-200)" : "black",
                textTransform: "uppercase",
              }}
            />
          </FlexCol>
        )}
        {linkMenuWindow && this.gridWrapperRef && (
          <LinkMenu
            w={linkMenuWindow.w}
            tables={tables}
            links={links}
            windows={windows}
            anchorEl={linkMenuWindow.anchorEl}
            db={prgl.db}
            dbs={prgl.dbs}
            onClose={() => this.setState({ linkMenuWindow: undefined })}
            gridRef={this.gridWrapperRef}
            onLinkTable={(tableName, path) =>
              onLinkTable(linkMenuWindow.w, tableName, path)
            }
          />
        )}
        <SilverGridReact
          _ref={(r) => {
            this.gridRef = r;
          }}
          layoutMode={workspace.publish_mode === "fixed" ? "fixed" : "editable"}
          defaultLayoutType={workspace.options.defaultLayoutType}
          className="min-h-0 relative"
          layout={workspace.layout}
          onChange={(newLayout) => {
            if (
              JSON.stringify(newLayout) !== JSON.stringify(workspace.layout)
            ) {
              workspace.$update({ layout: newLayout });
            }
          }}
          hideButtons={
            !isReadonly ? undefined : (
              {
                minimize: true,
                close: true,
                pan: true,
              }
            )
          }
          onClose={async (key, e) => {
            const w = renderedWindows.find((d) => d.id === key);
            if (w) await w.onClose?.(e);
            return 1;
          }}
        >
          {renderedWindows.map((d) => d.elem!)}
        </SilverGridReact>
      </div>
    );
  }
}

export const ViewRendererWrapped = (
  props: Omit<
    ViewRendererProps,
    "localSettings" | "searchParams" | "setSearchParams"
  >,
) => {
  const localSettings = useLocalSettings();
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <ErrorTrap>
      <ViewRenderer
        {...props}
        localSettings={localSettings}
        searchParams={searchParams}
        setSearchParams={setSearchParams}
      />
    </ErrorTrap>
  );
};
