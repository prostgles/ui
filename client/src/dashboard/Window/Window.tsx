import {
  mdiArrowCollapse,
  mdiClose,
  mdiCog,
  mdiCogOutline,
  mdiDockBottom,
  mdiDockLeft,
  mdiDockRight,
  mdiDockTop,
  mdiDockWindow,
  mdiOpenInNew,
} from "@mdi/js";

import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { ErrorTrap } from "@components/ErrorComponent";
import { FlexCol, FlexRow } from "@components/Flex";
import Popup from "@components/Popup/Popup";
import { SvgIcon } from "@components/SvgIcon";
import type { SingleSyncHandles } from "prostgles-client/dist/SyncedTable/SyncedTable";
import type { ReactNode } from "react";
import React from "react";
import ReactDOM from "react-dom";
import { t } from "../../i18n/i18nUtils";
import type { WindowData, WindowSyncItem } from "../Dashboard/dashboardUtils";
import type { DeepPartial, DeltaOf } from "../RTComp";
import RTComp from "../RTComp";
import type { ReactSilverGridNode } from "../SilverGrid/SilverGrid";
import { getSilverGridTitleNode } from "../SilverGrid/SilverGridChildHeader";
import type { ProstglesQuickMenuProps } from "../W_QuickMenu";
import { W_QuickMenu } from "../W_QuickMenu";
import {
  ChildWindowLayout,
  type ChildWindowLayoutProps,
} from "./ChildWindowLayout";
import { Select } from "@components/Select/Select";

type P<W extends WindowSyncItem> = {
  // w?: W;
  onWChange?: (w: W, delta: DeepPartial<W>) => any;
  connection: DBSSchema["connections"];
  children?: ReactNode;
  getMenu?: (w: W, onClose: () => any) => ReactNode;
  layoutMode: "fixed" | "editable";
  quickMenuProps?: W extends WindowSyncItem<"table"> | WindowSyncItem<"sql"> ?
    Omit<ProstglesQuickMenuProps, "w">
  : undefined;
} & ChildWindowLayoutProps<W>;

type S<W extends WindowSyncItem> = {
  showMenu: HTMLButtonElement | undefined;
  w?: W;
};

type D = {
  w?: WindowSyncItem;
  wSync?: SingleSyncHandles<WindowData>;
};

export default class Window<W extends WindowSyncItem> extends RTComp<
  P<W>,
  S<W>,
  D
> {
  state: S<W> = {
    showMenu: undefined,
  };

  d: D = {};

  onDelta = (dp: DeltaOf<P<W>>) => {
    const { onWChange } = this.props;
    if (dp?.onWChange && this.d.w) {
      onWChange?.(this.d.w as W, this.d.w as DeepPartial<W>);
    }

    if (!this.d.wSync) {
      const wSync = this.props.w.$cloneSync((_w, delta) => {
        const w = _w;
        this.setData({ w }, { w: delta });
        onWChange?.(w, delta);
        this.setState({ w });
      });

      this.setData({ wSync });
    }
  };

  onUnmount = async () => {
    await this.d.wSync?.$unsync();
    this.d.wSync = undefined;
  };

  getTitleIcon() {
    const { quickMenuProps } = this.props;
    const { w } = this.d;

    if (!quickMenuProps || !w) return null;
    if (w.type !== "table" && w.type !== "sql") {
      return null;
    }

    return <W_QuickMenu {...quickMenuProps} w={w} />;
  }

  ref?: HTMLDivElement;
  render(): ReactSilverGridNode | null {
    const {
      children,
      getMenu,
      layoutMode = "editable",
      connection,
      childWindow,
    } = this.props;
    const { showMenu } = this.state;
    const { w = this.props.w } = this.state;

    let titlePortal;
    const titleDiv = getSilverGridTitleNode(w.id);
    if (titleDiv) {
      const title = getWindowTitle(w);
      const tableName = w.table_name;
      const icon =
        tableName ? (connection.table_options?.[tableName]?.icon ?? "Table")
        : w.type === "sql" ? "ScriptOutline"
        : w.type === "method" ? "Function"
        : w.type === "map" ? "Map"
        : undefined;
      titlePortal = ReactDOM.createPortal(
        <FlexRow title={title} className="gap-p5">
          {icon && <SvgIcon className="text-1" icon={icon} />}
          <div>{title}</div>
        </FlexRow>,
        titleDiv,
      );
    }

    let menuPortal;
    const menuIconContainer = this.ref?.parentElement?.querySelector(
      ":scope > .silver-grid-item-header > .silver-grid-item-header--icon",
    );
    if (getMenu && menuIconContainer) {
      menuPortal = ReactDOM.createPortal(
        <>
          {this.getTitleIcon()}
          {layoutMode === "fixed" ?
            <div style={{ width: ".65em" }}></div>
          : <Btn
              className="f-0"
              iconPath={mdiCogOutline}
              title={t.Window["Open menu"]}
              data-command="dashboard.window.menu"
              onContextMenu={() => {
                void navigator.clipboard.writeText(w.id);
              }}
              onClick={(e) => {
                this.setState({
                  showMenu: showMenu ? undefined : e.currentTarget,
                });
              }}
            />
          }
        </>,
        menuIconContainer,
      );
    }

    const closeMenu = () => {
      this.setState({ showMenu: undefined });
    };

    const windowContent = (
      <>
        {titlePortal}
        {menuPortal}
        <div
          key={w.id + "-content"}
          className="Window flex-col f-1 min-h-0 min-w-0 relative"
          ref={(e) => {
            if (e) {
              let forceUpdate;
              if (!this.ref) {
                forceUpdate = true;
              }
              this.ref = e;
              if (forceUpdate) this.forceUpdate();
            }
          }}
        >
          <ErrorTrap>
            <ChildWindowLayout w={w} childWindow={childWindow}>
              {children}
            </ChildWindowLayout>
          </ErrorTrap>
        </div>

        {showMenu && getMenu && (
          <Popup
            title={t.Window.Menu}
            fixedTopLeft={true}
            anchorEl={showMenu}
            positioning={"center"}
            rootStyle={{ padding: 0 }}
            clickCatchStyle={{ opacity: 0.5, backdropFilter: "blur(1px)" }}
            contentClassName=""
            contentStyle={{
              overflow: "unset",
            }}
            onClose={closeMenu}
          >
            <ErrorTrap>{getMenu(w, closeMenu)}</ErrorTrap>
          </Popup>
        )}
      </>
    );

    if (w.parent_window_id && this.props.layoutMode === "editable") {
      return (
        <FlexCol
          data-command="Window.ChildChart"
          className="f-1 gap-0 min-s-0 o-hidden"
        >
          <FlexRow
            data-command="Window.ChildChart.toolbar"
            className="p-p25 gap-p25 bb b-color"
          >
            <Btn
              className="f-0 ml-auto"
              title={t.Window["Open menu"]}
              variant="faded"
              color="action"
              iconPath={mdiCog}
              data-command="dashboard.window.chartMenu"
              onClick={({ currentTarget }) => {
                this.setState({
                  showMenu: showMenu ? undefined : currentTarget,
                });
              }}
              size="small"
              // children={
              //   window.isLowWidthScreen ? null : t.Window["Chart options"]
              // }
            />

            <Btn
              iconPath={mdiArrowCollapse}
              color="action"
              variant="faded"
              title={t.Window["Collapse chart"]}
              data-command="dashboard.window.collapseChart"
              size="small"
              onClick={() => {
                w.$update({ minimised: true });
              }}
            />
            <Btn
              variant="faded"
              iconPath={mdiOpenInNew}
              color="action"
              title={t.Window["Detach chart"]}
              data-command="dashboard.window.detachChart"
              onClick={() => void w.$update({ parent_window_id: null })}
              size="small"
              // children={
              //   window.isLowWidthScreen ? null : t.Window["Detach chart"]
              // }
            />
            <Select
              showSelected="icon"
              fullOptions={[
                { key: "top", iconPath: mdiDockTop },
                { key: "right", iconPath: mdiDockRight },
                { key: "bottom", iconPath: mdiDockBottom },
                { key: "left", iconPath: mdiDockLeft },
                { key: "full", iconPath: mdiDockWindow },
              ]}
              size="small"
              title="Chart position"
              value={w.parent_window_options?.position ?? "bottom"}
              onChange={(value) => {
                w.$update(
                  {
                    parent_window_options: { position: value },
                  },
                  { deepMerge: true },
                );
              }}
            />
            <Btn
              variant="faded"
              title={t.Window["Close chart"]}
              data-command="dashboard.window.closeChart"
              iconPath={mdiClose}
              size="small"
              onClick={() => void w.$update({ closed: true })}
              // children={
              //   window.isLowWidthScreen ? null : t.Window["Close chart"]
              // }
            />
          </FlexRow>
          {windowContent}
        </FlexCol>
      );
    }

    return windowContent;
  }
}

export const getWindowTitle = (_w: WindowSyncItem) => {
  const w = _w.$get() as WindowSyncItem | undefined;
  const title =
    !w ? undefined : (
      w.name ||
      w.title?.replace("${rowCount}", "") ||
      w.table_name ||
      w.method_name ||
      w.id
    );
  return title || "Empty";
};
