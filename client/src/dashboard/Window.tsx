import {
  mdiArrowCollapse,
  mdiClose,
  mdiCog,
  mdiDotsVertical,
  mdiOpenInNew,
} from "@mdi/js";

import type { SingleSyncHandles } from "prostgles-client/dist/SyncedTable/SyncedTable";
import type { ReactNode } from "react";
import React from "react";
import ReactDOM from "react-dom";
import Btn from "../components/Btn";
import { ErrorTrap } from "../components/ErrorComponent";
import { FlexCol, FlexRow } from "../components/Flex";
import Popup from "../components/Popup/Popup";
import { t } from "../i18n/i18nUtils";
import type { WindowData, WindowSyncItem } from "./Dashboard/dashboardUtils";
import type { DeepPartial } from "./RTComp";
import RTComp from "./RTComp";
import type { ReactSilverGridNode } from "./SilverGrid/SilverGrid";
import { getSilverGridTitleNode } from "./SilverGrid/SilverGridChildHeader";
import type { ProstglesQuickMenuProps } from "./W_QuickMenu";
import { W_QuickMenu } from "./W_QuickMenu";

type P<W extends WindowSyncItem> = {
  w?: W;
  onWChange?: (w: W, delta: DeepPartial<W>) => any;

  children?: ReactNode;
  getMenu?: (w: W, onClose: () => any) => ReactNode;

  quickMenuProps?: W extends WindowSyncItem<"table"> | WindowSyncItem<"sql"> ?
    Omit<ProstglesQuickMenuProps, "w">
  : undefined;
};

type S<W extends WindowSyncItem> = {
  showMenu: boolean;
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
    showMenu: false,
  };

  d: D = {};

  static getTitle(_w: WindowSyncItem) {
    const w = _w.$get() as WindowSyncItem | undefined;
    const title =
      !w ? undefined : w.name || w.table_name || w.method_name || w.id;
    // if(!w){
    //   // TODO ensure on reconnect all syncs work as expected
    //   console.warn("Window not found. Reloading...");
    //   setTimeout(() => window.location.reload(), 500);
    // }
    return title || "Empty";
  }

  onDelta = (dp) => {
    const { w } = this.d;
    const { onWChange } = this.props;
    if (this.ref && w) {
      const titleDiv = getSilverGridTitleNode(w.id);
      const title = Window.getTitle(w);
      if (titleDiv && titleDiv.innerText !== title) {
        titleDiv.innerText = title;
        titleDiv.title = title;
      }
    }

    if (dp?.onWChange && this.d.w) {
      onWChange?.(this.d.w as any, this.d.w as any);
    }

    if (this.props.w && !this.d.wSync) {
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
    const { children, getMenu } = this.props;
    const { showMenu } = this.state;
    const { w = this.props.w } = this.state;

    if (!w) return null;

    let menuPortal;
    const menuIconContainer = this.ref?.parentElement?.querySelector(
      ":scope > .silver-grid-item-header > .silver-grid-item-header--icon",
    );
    if (getMenu && menuIconContainer) {
      menuPortal = ReactDOM.createPortal(
        <>
          <Btn
            className="f-0"
            iconPath={mdiDotsVertical}
            title={t.Window["Open menu"]}
            data-command="dashboard.window.menu"
            onContextMenu={(e) => {
              navigator.clipboard.writeText(w.id);
            }}
            onClick={() => {
              this.setState({ showMenu: !showMenu });
            }}
          />
          {this.getTitleIcon()}
        </>,
        menuIconContainer,
      );
    }

    const closeMenu = () => {
      this.setState({ showMenu: false });
    };

    const windowContent = (
      <>
        {menuPortal}
        <div
          key={w.id + "-content"}
          className="flex-col f-1 min-h-0 min-w-0 relative"
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
          <ErrorTrap>{children}</ErrorTrap>
        </div>

        {showMenu && getMenu && (
          <Popup
            title={window.isLowWidthScreen ? t.Window.Menu : undefined}
            fixedTopLeft={true}
            anchorEl={this.ref}
            positioning={"inside"}
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

    if (w.parent_window_id) {
      return (
        <FlexCol className="f-1 gap-0 min-s-0 o-hidden">
          <FlexRow className="p-p5">
            <Btn
              className="f-0"
              title={t.Window["Open menu"]}
              variant="outline"
              color="action"
              iconPath={mdiCog}
              data-command="dashboard.window.chartMenu"
              onClick={() => {
                this.setState({ showMenu: !showMenu });
              }}
              children={
                window.isLowWidthScreen ? null : t.Window["Chart options"]
              }
            />

            <Btn
              className="ml-auto"
              iconPath={mdiArrowCollapse}
              color="action"
              title={t.Window["Collapse chart"]}
              data-command="dashboard.window.collapseChart"
              onClick={() => {
                w.$update({ minimised: true });
              }}
            />
            <Btn
              variant="outline"
              iconPath={mdiOpenInNew}
              color="action"
              data-command="dashboard.window.detachChart"
              onClick={() => w.$update({ parent_window_id: null })}
              children={
                window.isLowWidthScreen ? null : t.Window["Detach chart"]
              }
            />
            <Btn
              variant="outline"
              data-command="dashboard.window.closeChart"
              iconPath={mdiClose}
              onClick={() => w.$update({ closed: true })}
              children={
                window.isLowWidthScreen ? null : t.Window["Close chart"]
              }
            />
          </FlexRow>
          {windowContent}
        </FlexCol>
      );
    }

    return windowContent;
  }
}
