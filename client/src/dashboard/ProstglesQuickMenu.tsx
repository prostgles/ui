import { mdiFilter, mdiSetLeftCenter } from "@mdi/js";

import React from "react";
import Btn from "../components/Btn";
import Popup from "../components/Popup/Popup";
import { CommonWindowProps } from "./Dashboard/Dashboard";
import { Link, OnAddChart, WindowData, WindowSyncItem } from "./Dashboard/dashboardUtils";

import { MultiSyncHandles, SyncDataItem } from "prostgles-client/dist/SyncedTable";
import { _PG_date, _PG_postgis } from "prostgles-types";
import { isJoinedFilter } from '../../../commonTypes/filterUtils';
import { DBS } from "./Dashboard/DBS";
import RTComp from "./RTComp";
import AddChartMenu from "./W_Table/TableMenu/AddChartMenu";
import { getChartColsV2 } from "./W_Table/TableMenu/getChartCols";
import { getLinkColorV2 } from "./W_Map/getMapLayerQueries";

export type ProstglesQuickMenuProps = {
  w: WindowSyncItem<"table"> | WindowSyncItem<"sql">;
  dbs: DBS;
  setLinkMenu?: (args: { 
    w: WindowSyncItem<"table">;
    anchorEl: HTMLElement | Element;
  }) => any;
  tables?: CommonWindowProps["tables"];
  onAddChart?: OnAddChart;
}

type S = {
  showChartMenu: boolean;
  myLinks?: SyncDataItem<Link>[];
}

type D = {
  linksSync?: MultiSyncHandles<Link>;
  myLinks?: SyncDataItem<Link>[];
}

export class ProstglesQuickMenu extends RTComp<ProstglesQuickMenuProps, S, D> {

  state: S = {
    showChartMenu: false,
    myLinks: []
  }

  d: D = {

  }

  onDelta = async () => {

    const { dbs, w } = this.props;
    if(w.workspace_id && !this.d.linksSync){
      
      const linksSync = await dbs.links.sync?.(
        { workspace_id: w.workspace_id }, 
        { handlesOnData: true }, 
        (links) => {
          if(!this.mounted) return;
          
          const myLinks = links.filter(l => !l.closed && !l.deleted && [l.w1_id, l.w2_id].includes(w.id));
          this.setState({ myLinks });
        }
      );

      this.setData({ linksSync }, {  linksSync })
    }
  }

  async onUnmount(){
    await this.d.linksSync?.$unsync();
    this.d.linksSync = undefined;
  }

  getMenu = (): React.ReactNode => {
    return null
  }

  ref?: HTMLDivElement;
  render() {
    const { w, setLinkMenu, tables, onAddChart } = this.props;
    const { myLinks } = this.state;

    const table = tables?.find(t => t.name === w.table_name);
    const showLinks = Boolean(setLinkMenu && w.table_name && table?.joins.length) || !!myLinks?.length;
    let canChart = Boolean(tables && getChartColsV2(w, tables).cols.length);// Boolean(table?.columns.some(c => [..._PG_date, ..._PG_postgis].some(v => v === c.udt_name) ));
    if(w.type === "sql"){
      const _w = w as WindowData<"sql">;
      canChart = Boolean(_w.options?.lastSQL && _w.options.sqlResultCols?.some(c => [..._PG_date, ..._PG_postgis].some(v => v === c.udt_name)))
    }

    if(!table && !showLinks && !canChart){
      return null;
    }

    let popup;
    const showChartButtons = canChart && tables && onAddChart;
    // if(showChartMenu && showChartButtons){
    //   popup = <AddChartMenu w={w} tables={tables} onAddChart={onAddChart} />
    // }

    const [firstLink] = myLinks ?? [];
    
    return <>
      <div 
        className="flex-row ai-center bg-3 rounded b b-gray-300 h-fit w-fit m-auto f-1 min-w-0" 
        style={{ maxWidth: "fit-content", margin: "2px 0" }}
        ref={e => {
          if(e) this.ref = e;
        }}
      >
        {showLinks && !!setLinkMenu && <Btn 
          title="Cross filter tables"
          className="prostgles-link-btn"
          size="small"
          iconPath={mdiSetLeftCenter} // mdiVectorPolyline
          style={!firstLink? {} : { color: getLinkColorV2(firstLink, 1).colorStr }}
          onClick={async e => {

            setLinkMenu({
              w: w as WindowSyncItem<"table">,
              anchorEl: e.currentTarget,
            });
          }}
        />}
        {showChartButtons && 
          <AddChartMenu 
            w={w} 
            tables={tables} 
            onAddChart={onAddChart}  
          />
        }
       
        {table && <Btn 
          title={"Show/Hide filtering"}
          className="prostgles-filter-btn"
          data-command="dashboard.window.toggleFilterBar"
          size="small"
          iconPath={mdiFilter}
          color={w.filter.some(f => !f.disabled ||
            f.type === "not null" || 
            f.type === "null" || 
            (isJoinedFilter(f)? f.filter.value !== undefined : f.value !== undefined)
          ) ? "action" : undefined}
          style={{ }}
          onClick={async e => {
            const _w: SyncDataItem<WindowData<"table">, true> = w as any;
            _w.$update({ options: { showFilters: !_w.options?.showFilters } }, { deepMerge: true })
            // if(!w.filter){
            //   w.$update({ filter: [] })
            // } else if(!w.filter?.length){
            //   w.$update({ filter: null })
            // }
          }}
        />}
      </div>

      {popup && <Popup 
        title="Add chart"
        anchorEl={this.ref}
        positioning={"inside"}
        rootStyle={{ padding: 0 }}
        clickCatchStyle={{ opacity: .5, backdropFilter: "blur(1px)"   }}
        contentClassName=""
        onClose={() => {
          this.setState({ showChartMenu: false })
        }}
      >
        {popup}
      </Popup>}
    </>  
  }
}