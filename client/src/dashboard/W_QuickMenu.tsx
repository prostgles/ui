import {
  mdiChartBoxMultipleOutline,
  mdiEyeOff,
  mdiFilter,
  mdiSetLeftCenter,
} from "@mdi/js";

import React from "react";
import Btn from "../components/Btn";
import Popup from "../components/Popup/Popup";
import type { CommonWindowProps } from "./Dashboard/Dashboard";
import type {
  OnAddChart,
  WindowData,
  WindowSyncItem,
} from "./Dashboard/dashboardUtils";

import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import { isJoinedFilter } from "../../../commonTypes/filterUtils";
import type { DBS } from "./Dashboard/DBS";
import { getLinkColorV2 } from "./W_Map/getMapLayerQueries";
import { AddChartMenu } from "./W_Table/TableMenu/AddChartMenu";
import type { ChartableSQL } from "./W_SQL/getChartableSQL";
import { t } from "../i18n/i18nUtils";

export type ProstglesQuickMenuProps = Pick<
  CommonWindowProps,
  "tables" | "prgl" | "myLinks" | "childWindows"
> & {
  w: WindowSyncItem<"table"> | WindowSyncItem<"sql">;
  dbs: DBS;
  setLinkMenu?: (args: {
    w: WindowSyncItem<"table">;
    anchorEl: HTMLElement | Element;
  }) => any;
  onAddChart?: OnAddChart;
  /**
   * If undefined then will show all
   */
  show?: { filter?: boolean; link?: boolean };
  chartableSQL: ChartableSQL | undefined;
};

export const W_QuickMenu = (props: ProstglesQuickMenuProps) => {
  const {
    w,
    setLinkMenu,
    onAddChart,
    show,
    chartableSQL,
    prgl,
    myLinks,
    childWindows,
  } = props;
  const { theme, tables } = prgl;
  const table = tables.find((t) => t.name === w.table_name);
  const showLinks =
    (!show || show.link) &&
    Boolean(
      (setLinkMenu && w.table_name && table?.joins.length) ||
        (w.type !== "sql" && !!myLinks.length),
    );

  let popup;

  const [firstLink] = myLinks;
  const divRef = React.useRef<HTMLDivElement>(null);

  if (!table && !showLinks && w.type === "table") {
    return null;
  }

  const bgColorClass = theme === "light" ? "bg-color-3" : "bg-color-0";

  const addChartProps =
    w.type === "sql" && chartableSQL ? { w, type: w.type, chartableSQL }
    : w.type === "table" ? { w, type: w.type }
    : undefined;

  const minimisedCharts = childWindows.filter(
    (w) => (w.type === "timechart" || w.type === "map") && w.minimised,
  );
  const hasMinimisedCharts = minimisedCharts.length > 0;

  return (
    <>
      <div
        className={
          "W_QuickMenu flex-row ai-center rounded b b-color h-fit w-fit m-auto f-1 min-w-0 " +
          bgColorClass
        }
        style={{ maxWidth: "fit-content", margin: "2px 0" }}
        ref={divRef}
      >
        {table && (!show || show.filter) && (
          <Btn
            title={t.W_QuickMenu["Show/Hide filtering"]}
            className={bgColorClass}
            data-command="dashboard.window.toggleFilterBar"
            size="small"
            iconPath={mdiFilter}
            color={
              (
                w.filter.some(
                  (f) =>
                    !f.disabled ||
                    f.type === "not null" ||
                    f.type === "null" ||
                    (isJoinedFilter(f) ?
                      f.filter.value !== undefined
                    : f.value !== undefined),
                )
              ) ?
                "action"
              : undefined
            }
            onClick={async (e) => {
              const _w: SyncDataItem<WindowData<"table">, true> = w as any;
              _w.$update(
                { options: { showFilters: !_w.options?.showFilters } },
                { deepMerge: true },
              );
            }}
          />
        )}
        {onAddChart && addChartProps && (
          <AddChartMenu
            {...addChartProps}
            tables={tables}
            childWindows={childWindows}
            myLinks={myLinks}
            onAddChart={onAddChart}
            btnClassName={bgColorClass}
          />
        )}
        {hasMinimisedCharts && (
          <Btn
            iconPath={mdiChartBoxMultipleOutline}
            title={t.W_QuickMenu["Restore minimised charts"]}
            data-command="dashboard.window.restoreMinimisedCharts"
            color="action"
            className={bgColorClass}
            size="small"
            onClick={() => {
              minimisedCharts.forEach((w) => {
                w.$update({ minimised: false });
              });
            }}
          />
        )}
        {showLinks && !window.isMobileDevice && !!setLinkMenu && (
          <Btn
            title={t.W_QuickMenu["Cross filter tables"]}
            className={bgColorClass}
            size="small"
            iconPath={mdiSetLeftCenter}
            style={
              firstLink && { color: getLinkColorV2(firstLink, 1).colorStr }
            }
            onClick={async (e) => {
              setLinkMenu({
                w: w as WindowSyncItem<"table">,
                anchorEl: e.currentTarget,
              });
            }}
          />
        )}
      </div>

      {popup && divRef.current && (
        <Popup
          title={t.W_QuickMenu["Add chart"]}
          anchorEl={divRef.current}
          positioning={"inside"}
          rootStyle={{ padding: 0 }}
          clickCatchStyle={{ opacity: 0.5, backdropFilter: "blur(1px)" }}
          contentClassName=""
          onClose={() => {}}
        >
          {popup}
        </Popup>
      )}
    </>
  );
};
