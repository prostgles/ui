import { mdiFile, mdiFunction, mdiRelationManyToMany, mdiScriptTextPlay, mdiTable, mdiTableEdit } from '@mdi/js';
import Icon from '@mdi/react';
import { MultiSyncHandles, SyncDataItem } from 'prostgles-client/dist/SyncedTable';
import { MethodFullDef, getKeys, isObject } from "prostgles-types";
import React from 'react';
import { dataCommand } from '../../Testing';
import Btn from "../../components/Btn";
import { FlexCol } from '../../components/Flex';
import { InfoRow } from "../../components/InfoRow";
import Popup from '../../components/Popup/Popup';
import SearchList from '../../components/SearchList';
import { Pan } from '../../components/Table/Table';
import { CommonWindowProps, DashboardProps, DashboardState, _Dashboard } from '../Dashboard/Dashboard';
import { WindowData, Workspace } from "../Dashboard/dashboardUtils";
import { ReactiveState, useReactiveState } from '../ProstglesMethod/hooks';
import { getFileText } from '../ProstglesSQL/W_SQLMenu';
import RTComp from "../RTComp";
import SchemaGraph from '../SchemaGraph';
import { SEARCH_TYPES, SearchAll, } from '../SearchAll';
import { kFormatter } from '../W_Table/W_Table';
import { LocalSettings, useLocalSettings } from "../localSettings";
import { PanEvent } from '../setPan';
import { DashboardMenuHeader } from './DashboardMenuHeader';
import { NewTableMenu } from "./NewTableMenu";

export type DashboardMenuProps = Pick<DashboardProps, "prgl" > & {
  suggestions: DashboardState["suggestions"];
  tables: CommonWindowProps["tables"];
  loadTable: _Dashboard["loadTable"];
  workspace: SyncDataItem<Workspace, true>;
  localSettings: LocalSettings;
  anchor: { 
    node: undefined | HTMLElement
    onClose: VoidFunction;
  };
}

type S = {
  showSearchAll?: { 
    mode: typeof SEARCH_TYPES[number]["key"];
    term?: string;
  }; 
  showSchemaDiagram: boolean;
  loading: boolean;
  queries: SyncDataItem<WindowData<"sql">>[];
  newWspName?: string;
  newWspErr?: any;
  dbSize?: string;
}

type D = {
}

class _DashboardMenu extends RTComp<DashboardMenuProps, S, D> {

  state: S = {
    loading: true, 
    showSchemaDiagram: false,
    queries: [],
  }

  d: D = {
  }

  windowsSync?: MultiSyncHandles<WindowData>

  /**
   * Used for CTRL+O file open
   */
  inptRef?: HTMLInputElement;
  fileSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if(file){
      // if(file.name.toLowerCase().endsWith(".sql")){
        this.props.loadTable({ sql: await getFileText(file), type: "sql", name: file.name });
      /* CSV?? */
      // } else {
        
      // }
    }
  }

  onMount(){
    window.addEventListener("keyup", this.onKeyUp, true);
    window.addEventListener("keydown", this.onKeyDown, true);
  }
 
  onKeyDown = e => {
    const term = window.getSelection()?.toString()?.trim();
    if(e.key === "p" && e.ctrlKey){
      e.preventDefault();
      this.setState({ showSearchAll: { mode: "views and queries", term } });
    } else if(e.key === "k" && e.ctrlKey){
      e.preventDefault();
      this.setState({ showSearchAll: { mode: "commands", term } });
    }
  }
 
  onKeyUp = e => {
    const term = window.getSelection()?.toString()?.trim();
    if(e.key === "o" && e.ctrlKey){
      e.preventDefault();
      if(this.inptRef){
        this.inptRef.click(); 
      }
      console.log(this.inptRef)
    } else if(e.key === "p" && e.ctrlKey){
      e.preventDefault();
      this.setState({ showSearchAll: { mode: "views and queries", term } });
    } else if(e.key === "F" && e.shiftKey && e.ctrlKey){
      e.preventDefault();
      this.setState({ showSearchAll: { mode: "rows", term } })
    } else if(e.key === "Escape"){
      this.setState({ showSearchAll: undefined });
    }
  }

  onUnmount(){
    window.removeEventListener("keyup", this.onKeyUp, true);
    window.removeEventListener("keydown", this.onKeyDown, true);
    this.windowsSync?.$unsync();
  }

  async onDelta(){
    const { workspace, prgl } = this.props;

    if(!this.windowsSync){
      const filter = workspace.options.showAllMyQueries? {} : { workspace_id: workspace.id };

      this.windowsSync = await prgl.dbs.windows.sync!(
        filter, 
        { handlesOnData: true, select: "*", patchText: false  }, 
        (wnds, deltas) => {
          if(!this.mounted) return;
          
          const windows = wnds.sort((a, b) => +a.last_updated - +b.last_updated);
          const queries = windows.filter(w => w.type === "sql" && !w.deleted) as any;
          this.setState({ queries });
        }
      );
    }
  }

  ref?: HTMLDivElement;
  dragging?: {
    startClientX: number;
    clientX: number;
    startWidth: number;
  }
  onResize = (e: PanEvent) => {
    if(!this.ref || !this.dragging){
      return false;
    }
    this.ref.style.width = `${this.dragging.startWidth + (e.x - this.dragging.startClientX)}px`
  }

  renderMainContent = (pClose: VoidFunction) => {
    const { queries } = this.state;
    const { 
      tables, loadTable, 
      workspace, localSettings,
      prgl, 
    } = this.props;
    const { db, methods } = prgl;
    const closedQueries = queries.filter(q => q.closed);

    const smallScreen = window.innerHeight < 1200;
    const pinnedMenu = workspace.options.pinnedMenu && !window.isLowWidthScreen;

    const { centeredLayout } = localSettings;
    const maxWidth = centeredLayout?.enabled? ((window.innerWidth - centeredLayout.maxWidth)/2) + "px" : "50vw";

    const detailedMethods: (MethodFullDef & { name: string; })[] = getKeys(methods).filter(n => {
      const m = methods[n]
      return m && typeof m !== "function" && isObject(m) && m.run 
    }).map(methodName => ({
      name: methodName,
      ...methods[methodName] as MethodFullDef
    }))
    
    return <FlexCol 
      className={"DashboardMenu relative f-1 min-h-0 " + (prgl.theme === "light"? " bg-0 " : " bg-0p5 ") + (window.isMobileDevice? " p-p25 " : " p-1  " )}
      ref={e => {
        if(e) {
          this.ref = e;
        }
      }}
      style={{
        ...(pinnedMenu && { 
          minWidth: "200px",
          maxWidth,
          width: workspace.options.pinnedMenuWidth? `${workspace.options.pinnedMenuWidth}px` : "fit-content",
          height: "100%", 
        })
      }}
      onKeyDown={e => {
        if(e.key === "Escape"){
          pClose()
        }
      }}
    >
      {this.ref &&  <Pan key={"wsp"}
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: "25px",
          cursor: "ew-resize",
        }}
        onPress={(e, node) => {
          node.classList.toggle("resizing-ew", true);
        }}
        onRelease={(e, node) => {
          node.classList.toggle("resizing-ew", false);
        }}
        onPanStart={e => {
          if(!this.ref) return;
          this.dragging = { startClientX: e.x, clientX: e.x, startWidth: this.ref.clientWidth }
        }}
        onPan={this.onResize}
        onPanEnd={e => {
          this.dragging = undefined;    
          workspace.$update({ options: { pinnedMenuWidth: this.ref?.clientWidth } }, { deepMerge: true });
        }}
      />}
      <DashboardMenuHeader 
        { ...this.props }
        onClickSearchAll={() => {          
          this.setState({ showSearchAll: { mode: "views and queries", term: undefined } });          
        }}
        pinnedMenu={pinnedMenu}
        onClose={pClose}
      />
      
      {!closedQueries.length? null : 
        <SearchList
          id="search-list-queries"
          className={" b-t f-1 min-h-0 " + smallScreen? " mt-p5 " : " mt-1 "}
          style={{ minHeight: "120pxx", maxHeight: "30vh" }}
          placeholder={`${closedQueries.length} saved queries`} 
          noSearchLimit={3}
          items={closedQueries.sort((a, b) => +b.last_updated - +a.last_updated).map((t, i)=> ({
            key: i,
            contentLeft: (
              <div className="flex-col ai-start f-0 mr-p5 text-1p5">
                <Icon path={mdiScriptTextPlay} size={1} /> 
              </div>
            ),
            label: t.name,
            contentRight: (<span className="text-gray-400 ml-auto italic">{t.sql.trim().slice(0, 10)}...</span>),
            onPress: () => {
              t.$update?.({ closed: false, workspace_id: workspace.id })
              pClose();
            }
          }))}
        />
      }
      
      {!tables.length? <div className="text-1p5 p-1">0 tables/views</div> : 
        <SearchList
          limit={100}
          noSearchLimit={0}
          data-command="dashboard.menu.tablesSearchList"
          inputProps={dataCommand("dashboard.menu.tablesSearchListInput")}
          className={"search-list-tables b-t f-1 min-h-0 " + (smallScreen? " mt-p5 " : " mt-1 ")}
          placeholder={`${tables.length} tables/views`} 
          items={tables.sort((a, b) => 
              workspace.options.hideCounts? 
                a.name.localeCompare(b.name) : 
                +b.count - +a.count
            ).map((t, i)=> ({
              contentLeft: (
                <div className="flex-col ai-start f-0 mr-p5 text-1p5"
                  { ...(t.info.isFileTable? dataCommand("dashboard.menu.fileTable") : {})}
                >
                  <Icon path={t.info.isFileTable? mdiFile : db[t.name]?.insert? mdiTableEdit : mdiTable} size={1} />
                </div>
              ),
              key: t.name,
              label: t.name,
              // disabledInfo: t.columns.length? undefined : "Table has no columns",
              contentRight: +t.count > 0? (<span className="text-gray-400 ml-auto">{kFormatter(+t.count)}</span>) : null,
              onPress: () => {
                loadTable({ type: "table", table: t.name });
                pClose();
              }
            }))
          }
        />
      }
      {detailedMethods.length > 0 && <SearchList
        limit={100}
        noSearchLimit={0} 
        className={"search-list-functions b-t f-1 min-h-0 " + (smallScreen? " mt-p5 " : " mt-1 ")}
        style={{ minHeight: "120px" }} 
        placeholder={"Search " + detailedMethods.length + " functions"} 
        items={detailedMethods.map((t, i)=> ({ 
          contentLeft: (
            <div className="flex-col ai-start f-0 mr-p5 text-1p5">
              <Icon path={mdiFunction} size={1} />
            </div>
          ),
          key: t.name,
          label: t.name,
          onPress: () => {
            loadTable({ type: "method", method_name: t.name });
            pClose();
          }
        }))}
      />}
      <div className="flex-row-wrap f-0 my-p5">
        {!tables.length && !db.sql && <InfoRow>You have not been granted any permissions. Check with system administrator </InfoRow>}

        <NewTableMenu 
          {...this.props} 
          loadTable={args => {
            pClose();
            return loadTable(args);
          }} 
        />

        {tables.length > 1 && <Btn iconPath={mdiRelationManyToMany}
          className="fit ml-2"
          size="small"
          style={{ opacity: 0.05 }}
          title="Show schema diagram"
          data-command="schema-diagram"
          variant="outline"
          onClick={() => {
            this.setState({ showSchemaDiagram: true });
            pClose();
          }}
        >Schema diagram</Btn>}

      </div>
    </FlexCol>
  }


  render() {
    const { showSchemaDiagram, showSearchAll, queries } = this.state;
    const { 
      suggestions,tables, loadTable, workspace, anchor, prgl, 
    } = this.props;
    const { db, dbs, } = prgl
    if(!(dbs as any).workspaces.insert) return null;

    let popup;
    if(showSchemaDiagram){
      popup = <Popup 
        title="Schema diagram"
        positioning="top-center" 
        onClose={() => this.setState({ showSchemaDiagram: false })}
      >
        <SchemaGraph db={db} onClickTable={table => {
          loadTable({ type: "table", table, name: table })
          this.setState({ showSchemaDiagram: false })
        }}/> 
      </Popup>
    }

    const pinnedMenu = workspace.options.pinnedMenu && !window.isLowWidthScreen;
    if(!pinnedMenu && !anchor.node && !showSearchAll) return null;
    const mainContent = pinnedMenu? 
      this.renderMainContent(() => {}) : 
      <Popup
        key="main menu"
        title=" "
        onClickClose={false}
        onClose={anchor.onClose}
        rootStyle={{
          // top: window.isMobileDevice? 0 : "65px",
          // left: 0,
          // maxHeight: `calc(100vh - 85px)`
          // maxHeight: `100%` 
        }}
        positioning="beneath-left"
        anchorEl={anchor.node}
        contentStyle={{
          overflow: "hidden",
          padding: 0
        }}
        autoFocusFirst={{ 
          selector: `.search-list-tables input`
        }}
      >
        {this.renderMainContent(anchor.onClose)}
      </Popup>

    return <>
      {popup}
        {showSearchAll &&
          <SearchAll 
            db={db} 
            methods={this.props.prgl.methods}
            tables={tables}
            searchType={showSearchAll.mode}
            defaultTerm={showSearchAll.term}
            suggestions={suggestions?.searchAll}
            queries={queries}
            loadTable={loadTable}
            onOpenDBObject={(s, method_name)=> {
              if(method_name){
                loadTable({ type: "method", method_name });
              } else if(!s){

              } else if(s.type === "function"){
                loadTable({ type: "sql", sql: s.definition, name: s.name });
              } else if((s as any).type === "table") {
                if(db[s.name]){
                  loadTable({ type: "table", table: s.name, name: s.name });
                } else {
                  loadTable({ type: "sql", sql: `SELECT *\nFROM ${s.escapedIdentifier}\nLIMIT 25`, name: s.name });
                }
              } else {
                throw s;
              }
            }}
            onOpen={({ filter, table }) => { loadTable({ type: "table", table, filter }) }} 
            onClose={() => { this.setState({ showSearchAll: undefined }) }} 
          />
        } 

        {/* Used to CTRL+O open an sql file */}
        <input 
          ref={e => { 
            if(e) this.inptRef = e; 
          }} 
          type="file" 
          accept="text/*, .sql, .txt" 
          className="hidden" 
          onChange={e => {
            return this.fileSelected(e);
          }}
        />
        {mainContent}
    </>
  }
}


export const DashboardMenu = ({ menuAnchorState, ...p }: Omit<DashboardMenuProps, "localSettings" | "anchor"> & { menuAnchorState: ReactiveState<HTMLElement | undefined>; }) => {
  const localSettings = useLocalSettings();
  const { state: menuAnchor, setState } = useReactiveState(menuAnchorState);
  return <_DashboardMenu {...p} anchor={{ node: menuAnchor, onClose: () => setState(undefined) }} localSettings={localSettings} /> 
}