import { mdiDotsVertical, } from "@mdi/js";

import { SingleSyncHandles } from "prostgles-client/dist/SyncedTable";
import React, { ReactNode } from "react";
import ReactDOM from 'react-dom';
import Btn from "../components/Btn";
import { ErrorTrap } from "../components/ErrorComponent";
import Popup from "../components/Popup/Popup";
import { DBS } from "./Dashboard/DBS";
import { CommonWindowProps } from "./Dashboard/Dashboard";
import { OnAddChart, WindowData, WindowSyncItem } from "./Dashboard/dashboardUtils";
import { ProstglesQuickMenu, ProstglesQuickMenuProps } from "./ProstglesQuickMenu";
import RTComp, { DeepPartial } from "./RTComp";
import { ReactSilverGridNode } from "./SilverGrid/SilverGrid";
import { GridHeaderClassname } from "./SilverGrid/SilverGridChildHeader";

type P<W extends WindowSyncItem> = {
  w?: W;
  onWChange?: (w: W, delta: DeepPartial<W>) => any;

  children?: ReactNode;
  getMenu?: (w: W, onClose: () => any) => ReactNode;


  quickMenuProps?: W extends WindowSyncItem<"table"> | WindowSyncItem<"sql">? {
    tables?: CommonWindowProps["tables"];
    setLinkMenu?: ProstglesQuickMenuProps["setLinkMenu"];
    dbs: DBS;
    onAddChart?: OnAddChart;
  } : undefined
}

type S<W extends WindowSyncItem> = {
  showMenu: boolean;
  w?: W;
}

type D = {
  w?: WindowSyncItem;
  wSync?: SingleSyncHandles<WindowData>
}

export default class Window<W extends WindowSyncItem> extends RTComp<P<W> , S<W> , D> {

  state: S<W> = {
    showMenu: false
  }

  d: D = {

  }

  static getTitle(w: WindowData){
    return w.name || w.table_name || w.method_name || w.id || "Empty";
  }

  onDelta = (dp) => {
    const { w } = this.d;
    const { onWChange } = this.props;
    if(this.ref && w){
      const titleDiv: HTMLDivElement | undefined = this.ref.parentElement?.querySelector(`:scope > .silver-grid-item-header > div > .${GridHeaderClassname}`) ?? undefined;
      const title = Window.getTitle(w);
      if(titleDiv && titleDiv.innerText !== title){
        titleDiv.innerText = title;
        titleDiv.title = title;
      }
    }

    if(dp?.onWChange && this.d.w){
      onWChange?.(this.d.w as any, this.d.w  as any)
    }

    if(this.props.w && !this.d.wSync) {

      const wSync = this.props.w.$cloneSync((_w, delta) => {
        const w = _w as any;// as any as W;
        this.setData({ w }, { w: delta as any });
        onWChange?.(w, delta as any)
        this.setState({ w })
      });
      
      this.setData({ wSync })
    }
  }

  onUnmount = async () => {
    await this.d.wSync?.$unsync();
    this.d.wSync = undefined;
  }

  getTitleIcon(){
    const { quickMenuProps } = this.props;
    const { w } = this.d;

    if(!quickMenuProps || !w) return null;

    const { setLinkMenu, dbs, tables, onAddChart  } = quickMenuProps;
    
    return <ProstglesQuickMenu 
        tables={tables} 
        w={w as any} 
        dbs={dbs} 
        setLinkMenu={setLinkMenu} 
        onAddChart={onAddChart} 
      />
  }


  ref?: HTMLDivElement;
  render(): ReactSilverGridNode | null {
    const { children, getMenu } = this.props;
    const { showMenu } = this.state;
    const { w } = this.state;

    if(!w) {
      return null;
    }

    let menuPortal;
    const menuIconContainer = this.ref?.parentElement?.querySelector(":scope > .silver-grid-item-header > .silver-grid-item-header--icon");
    if(getMenu && menuIconContainer){
      menuPortal = ReactDOM.createPortal(
        <>
          <Btn className="f-0" 
            iconPath={mdiDotsVertical}
            title="Open menu"
            data-command="dashboard.window.menu"
            onClick={() => {
              this.setState({ showMenu: !showMenu })
            }}
          />
          {this.getTitleIcon()}
        </>,
        menuIconContainer
      );
    }
    
    const closeMenu = () => {
      this.setState({ showMenu: false })
    }

    return <>
      {menuPortal}
      <div key={w.id + "-content"} 
        className="flex-col f-1 min-h-0 min-w-0 relative"
        ref={e => {
          if(e) {
            let forceUpdate;
            if(!this.ref){
              forceUpdate = true;
            }
            this.ref = e;
            if(forceUpdate) this.forceUpdate();
          }
        }}
      >
        <ErrorTrap>{children}</ErrorTrap>
      </div>

      {showMenu && getMenu && <Popup
        title={window.isLowWidthScreen? "Menu" : undefined} 
        anchorEl={this.ref}
        positioning={"inside"}
        rootStyle={{ padding: 0 }}
        clickCatchStyle={{ opacity: .5, backdropFilter: "blur(1px)" }}
        contentClassName=""
        contentStyle={{
          overflow: "unset",
        }}
        onClose={closeMenu}
      >
        <ErrorTrap>{getMenu(w, closeMenu)}</ErrorTrap>
      </Popup>}
    </>  
  }
}