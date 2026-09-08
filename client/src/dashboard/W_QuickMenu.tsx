import {
  mdiChartBoxMultipleOutline,
  mdiCodeJson,
  mdiCogOutline,
  mdiMagnify,
  mdiSetLeftCenter,
  mdiTableLarge,
  mdiViewAgendaOutline,
} from "@mdi/js";

import Btn from "@components/Btn";
import React, { useState } from "react";
import type { CommonWindowProps } from "./Dashboard/Dashboard";
import type { WindowSyncItem } from "./Dashboard/dashboardUtils";

import { isJoinedFilter } from "@common/filterUtils";
import { tableMightBeUndefinedDueToAccessControl } from "@common/utils";
import { classOverride, FlexRow } from "@components/Flex";
import Popup from "@components/Popup/Popup";
import { Select } from "@components/Select/Select";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { t } from "../i18n/i18nUtils";
import type { DBS } from "./Dashboard/DBS";
import { getLinkColorV2 } from "./W_Map/fetchData/getMapLayerQueries";
import type { ChartableSQL } from "./W_SQL/getChartableSQL";
import { AddChartMenu } from "./W_Table/TableMenu/AddChartMenu";
import { TableDisplayOptionsJSON } from "./W_Table/TableMenu/TableDisplayOptionsJSON";

export type ProstglesQuickMenuProps = Pick<
  CommonWindowProps,
  "myLinks" | "childWindows" | "getLinksAndWindows"
> & {
  w: WindowSyncItem<"table"> | WindowSyncItem<"sql">;
  dbs: DBS;
  setLinkMenu?: (args: {
    w: WindowSyncItem<"table">;
    anchorEl: HTMLElement | Element;
  }) => any;
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
    show,
    chartableSQL,
    myLinks,
    childWindows,
    getLinksAndWindows,
  } = props;
  const { tables, dbs } = usePrgl();
  const table = tables.find((t) => t.name === w.table_name);
  const showLinks =
    (!show || show.link) &&
    Boolean(
      (setLinkMenu && w.table_name && table?.joinsV2.length) ||
      (w.type !== "sql" && !!myLinks.length),
    );

  const [firstLink] = myLinks;
  const divRef = React.useRef<HTMLDivElement>(null);

  if (!table && !showLinks && w.type === "table") {
    return null;
  }

  const addChartProps =
    w.type === "sql" && chartableSQL ? { w, type: w.type, chartableSQL }
    : w.type === "table" ? { w, type: w.type }
    : undefined;

  const minimisedCharts = childWindows.filter(
    (w) => (w.type === "timechart" || w.type === "map") && w.minimised,
  );
  const hasMinimisedCharts = minimisedCharts.length > 0;
  const [showCardViewOptions, setShowCardViewOptions] = useState<HTMLElement>();

  return (
    <>
      <FlexRow
        data-command="Window.W_QuickMenu"
        className={classOverride(
          "W_QuickMenu pl-p5 rounded bb-color h-fit w-fit m-auto f-1 min-w-0 o-auto no-scroll-bar ",
        )}
        style={{ maxWidth: "fit-content", margin: "2px 0", gap: "1px" }}
        ref={divRef}
      >
        {Boolean(
          tableMightBeUndefinedDueToAccessControl(dbs.windows)?.insert,
        ) &&
          addChartProps &&
          !show && (
            <AddChartMenu
              {...addChartProps}
              childWindows={childWindows}
              myLinks={myLinks}
              getLinksAndWindows={getLinksAndWindows}
            />
          )}
        {hasMinimisedCharts && (
          <Btn
            iconPath={mdiChartBoxMultipleOutline}
            title={t.W_QuickMenu["Restore minimised charts"]}
            data-command="dashboard.window.restoreMinimisedCharts"
            color="action"
            variant="icon"
            size="small"
            onClick={() => {
              minimisedCharts.forEach((w) => {
                void w.$update({ minimised: false });
              });
            }}
          />
        )}
        {showLinks &&
          !window.isMobileDevice &&
          !!setLinkMenu &&
          w.type === "table" && (
            <>
              {showCardViewOptions && (
                <Popup
                  onClose={() => setShowCardViewOptions(undefined)}
                  title="Card view options"
                  positioning="center"
                  clickCatchStyle={{ opacity: 1 }}
                >
                  <TableDisplayOptionsJSON tableName={w.table_name} />
                </Popup>
              )}
              <Btn
                title={t.W_QuickMenu["Cross filter tables"]}
                data-command="Window.W_QuickMenu.addCrossFilteredTable"
                size="small"
                variant="icon"
                iconPath={mdiSetLeftCenter}
                style={
                  firstLink && { color: getLinkColorV2(firstLink, 1).colorStr }
                }
                onClick={(e) => {
                  setLinkMenu({
                    w,
                    anchorEl: e.currentTarget,
                  });
                }}
              />
              <Select
                title="View mode"
                fullOptions={
                  [
                    {
                      key: "table",
                      iconPath: mdiTableLarge,
                    },
                    {
                      key: "card",
                      iconPath: mdiViewAgendaOutline,
                      rightContent: (
                        <Btn
                          iconPath={mdiCogOutline}
                          size="micro"
                          onClick={(e) =>
                            setShowCardViewOptions(e.currentTarget)
                          }
                        />
                      ),
                    },
                    {
                      key: "json",
                      iconPath: mdiCodeJson,
                    },
                  ] as const
                }
                btnProps={{
                  variant: "icon",
                }}
                showSelected="icon"
                value={w.options.viewAs?.type ?? "table"}
                onChange={(viewAsType) => {
                  void w.$update({
                    options: {
                      viewAs: {
                        type: viewAsType,
                      },
                    },
                  });
                }}
              />
            </>
          )}
        {table && (!show || show.filter) && w.type === "table" && (
          <Btn
            title={t.W_QuickMenu["Show/Hide filtering"]}
            data-command="dashboard.window.toggleFilterBar"
            size="small"
            variant="faded"
            iconPath={mdiMagnify}
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
            onClick={() => {
              void w.$update(
                { options: { showFilters: !w.options.showFilters } },
                { deepMerge: true },
              );
            }}
          />
        )}
      </FlexRow>
    </>
  );
};
