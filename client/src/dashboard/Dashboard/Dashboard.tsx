import React from 'react';

import Loading from '../../components/Loading';

import Btn from "../../components/Btn";
import { getSqlSuggestions } from "../SQLEditor/SQLEditorSuggestions";

import { MultiSyncHandles, SingleSyncHandles } from 'prostgles-client/dist/SyncedTable';
import { DBHandlerClient } from 'prostgles-client/dist/prostgles';
import { DBSchemaTable } from "prostgles-types";
import FormField from '../../components/FormField/FormField';
import Popup, { PopupProps } from '../../components/Popup/Popup';
import RTComp from "../RTComp";
import { DBObject } from '../SearchAll';

import { mdiContentSave, mdiDelete } from "@mdi/js";
import { NavigateFunction, useNavigate } from "react-router-dom";
import { SmartGroupFilter } from '../../../../commonTypes/filterUtils';
import { Prgl } from '../../App';
import { FlexCol } from '../../components/Flex';
import { TopControls } from "../../pages/TopControls";
import { DashboardMenu } from '../DashboardMenu/DashboardMenu';
import { ActiveRow } from "../W_Table/W_Table";
import { getJoinedTables } from "../W_Table/tableUtils/tableUtils";
import { LocalSettings, useLocalSettings } from "../localSettings";
import { ViewRendererProps, ViewRendererWrapped } from "./ViewRenderer";
import {
  ChartType, DBSchemaTablesWJoins,
  LinkSyncItem,
  LoadedSuggestions, OnAddChart, TopHeaderClassName, WindowData, WindowSyncItem,
  Workspace, WorkspaceSchema, WorkspaceSyncItem,
  getDefaultLayout
} from "./dashboardUtils";
import { createReactiveState } from '../ProstglesMethod/hooks';
import ErrorComponent from '../../components/ErrorComponent';

const FORCED_REFRESH_PREFIX = "force-" as const;
export type DashboardProps = {
  prgl: Prgl;
  workspaceId?: string;
  localSettings: LocalSettings;
  onLoaded: VoidFunction;
  navigate: NavigateFunction;
}
export type DashboardState = {
  tables?: DBSchemaTablesWJoins;
  loading: boolean,
  minimised: boolean;
  namePopupWindow?: { w: WindowSyncItem; node: HTMLButtonElement; };

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
}
export type DashboardData = {
  links: LinkSyncItem[];
  linksSync?: any;
  closedWindows: WindowSyncItem[];
  allWindows: WindowSyncItem[];
  windows: WindowSyncItem[];
  windowsSync?: MultiSyncHandles<WindowData<ChartType>>;
  workspace?: WorkspaceSyncItem;
  workspaceSync?: SingleSyncHandles<Workspace>;
}

export class _Dashboard extends RTComp<DashboardProps, DashboardState, DashboardData> {
  state: DashboardState = {
    loading: true,
    minimised: false,
    imported: 0,
  }
  d: DashboardData = {
    closedWindows: [],
    allWindows: [],
    windows: [],
    links: [],
    linksSync: null
  }

  static getTables = async (schemaTables: DBSchemaTable[], w: WorkspaceSyncItem | undefined, db: DBHandlerClient, ): Promise<{ tables: DBSchemaTablesWJoins; error?: undefined } | { error: any; tables?: undefined }> => {

    try {
      const tables = await Promise.all(schemaTables.map(async t => {
        const countRequestedAndAllowed = w && !w.options.hideCounts && db[t.name]?.count;
        const tableHasColumnsAndWillNotError = t.columns.length;
        const shouldGetCount = countRequestedAndAllowed && tableHasColumnsAndWillNotError;
        return {
          ...t,
          count: (shouldGetCount? await db[t.name]?.count?.() ?? "" : "").toString(),
          ...getJoinedTables(schemaTables, t.name, db),
        }
      })).catch(e => {

        console.error(e);
        throw e;
      });
      return { tables }
    } catch(error: any){
      return {
        error
      }
    }
  }

  onUnmount(){
    const { workspaceSync, windowsSync, linksSync } = this.d;
 
    [workspaceSync, windowsSync, linksSync].map(s => {
      if(s && s.unsync) s.unsync();
    });
  }

  loadingSchema: DashboardState["suggestions"];
  loadSchema = async (force = false): Promise<void> => {
    const { db, connectionId, tables: dbSchemaTables } = this.props.prgl;
    const workspace = this.d.workspace;
    const dbKey = force? `${FORCED_REFRESH_PREFIX}${Date.now()}` : this.props.prgl.dbKey;
    if(workspace && (this.loadingSchema?.dbKey !== dbKey || force) && connectionId){
      this.loadingSchema = {
        dbKey,
        settingSuggestions: [],
        connectionId,
        suggestions: [],
        onRenew: () => this.loadSchema(true),
      };

      const { tables = [], error } = await _Dashboard.getTables(dbSchemaTables, workspace, db);

      const ns: Pick<DashboardState, "tables" | "suggestions" | "loading" | "error"> = {
        tables,
        loading: false,
        error,
        suggestions: undefined
      }

      try {
        if(db.sql){
          const { sql } = db;
          
          // console.time("getSuggestions")
          const suggestions = await getSqlSuggestions({ sql });
          // console.timeEnd("getSuggestions")
          const schema = {
            ...suggestions,
            connectionId,
            dbKey,
            searchAll: suggestions.suggestions.filter(s => ["table", "function"].includes(s.type)) as any
          }
          this.loadingSchema = { ...this.loadingSchema!, ...schema };
          ns.suggestions = { ...this.loadingSchema! };
        }
        
      } catch(e){
        this.loadingSchema = undefined;
        console.error("Issue with getSuggestions:", e)
      }
      this.props.onLoaded();
      this.setState(ns)
    } 
  }


  loadingTables = false;
  syncsSet = false;
  onDelta = async (dp: DashboardProps, ds: DashboardState, dd: any) => {
    const delta = ({ ...dp, ...ds, ...dd });
    const { prgl: { connectionId, dbs, }, workspaceId } = this.props;
    const { workspace } = this.d;
    let ns: Partial<DashboardState> = {};

    const workspaces = dbs.workspaces;// as TableHandlerClient<WorkspaceSchema>;
    if(workspaces.syncOne && !this.syncsSet && connectionId){
      this.syncsSet = true;
       
      const wspFilter = { connection_id: connectionId, deleted: false }
      if(!+(await workspaces.count(wspFilter))){
        const defaultIsDeleted = +(await workspaces.count({ connection_id: connectionId, name: "default", deleted: true }));
        
        await workspaces.insert({ 
          connection_id: connectionId, 
          name: !defaultIsDeleted? "default" : `default ${Date.now()}`, 
          options: { hideCounts: false, pinnedMenu: true }, 
          ...({} as Pick<WorkspaceSchema, "user_id" | "last_updated">) 
        }, { returning: "*" });
        window.location.reload();
      }
      let wsp: Workspace | undefined;
      try {
        wsp = await workspaces.findOne(workspaceId? { id: workspaceId, ...wspFilter } : wspFilter, { orderBy: { last_used: -1 } }) as Workspace;
      } catch(e){
        this.setState({ wspError: e });
        return;
      }

      if(!wsp as any){
        this.setState({ wspError: true });
        return;
      } else {
        // TODO: why does this break things?
        // workspaces.update({ id: wsp.id }, { last_used: new Date() as any })
      }

      const validatedCols = await this.props.prgl.dbs.workspaces.getColumns?.("en", {
        rule: "update",
        filter: { id: wsp.id },
        data: { name: "" }
      }).catch(console.error) ?? [];

      const isReadonly = validatedCols.every(c => !c.update);
      // console.log(validatedCols.map(c => pickKeys(c, ["name", "select", "update", "filter"] )));
      this.setState({
        isReadonly
      });
      const { connection } = this.props.prgl;
      window.document.title = `Prostgles UI - ${connection.name || connection.db_host}`;

      let updatedLastUsed = false;
      const workspaceSync = await workspaces.syncOne(
        { id: wsp.id, deleted: false }, 
        { handlesOnData: true }, 
        (workspace, delta) => {
          if(!this.mounted) return;
          if(!updatedLastUsed){
            updatedLastUsed = true;
            workspace.$update?.({ last_used: new Date() as any })
          }
          this.setData({ workspace }, { workspace: delta })
        }
      );

      const linksSync = await dbs.links.sync?.(
        { workspace_id: wsp.id }, 
        { handlesOnData: true }, 
        (links, delta) => {
          if(!this.mounted) return;

          this.setData({ links: links as any }, { links: delta as any });
        }
      );

      const windowsSync = await dbs.windows.sync?.(
        // { closed: false, workspace_id: wsp.id }, 
        { workspace_id: wsp.id }, 
        { handlesOnData: true, select: "*", patchText: false  }, 
        (_wnds, deltas) => {
          const wnds: WindowSyncItem[] = _wnds as any;
          if(!this.mounted) return;
          
          const windows = wnds.sort((a, b) => +a.last_updated - +b.last_updated);

          /** Fix options update deepMerge bug */
          // const deb = windows.find(w => w.name === "SCHEMA");
          // console.error(deb?.options);

          const closedWindows = windows.filter(w => w.closed && !w.table_name && w.name);
          const openWindows = windows.filter(w => !w.closed);

          // console.log(openWindows.map(w => w.table_name))
          /* This seems to break show_menu?? */
          // if(this.d.windows){

            /** Dashboard only re-renders on window ids or names change OR linked windows filters change
             * Maybe ....
            */
           const stringOpts = (w: WindowSyncItem) => `${w.id} ${w.type} ${w.fullscreen} ${JSON.stringify(w.filter)} `; // ${JSON.stringify((w as any).options?.extent ?? {})}
            if(this.d.windows.map(stringOpts).sort().join() === openWindows.map(stringOpts).sort().join()){
              return
            }
          // }

          this.setData({ allWindows: windows, windows: openWindows, closedWindows }, { windows: deltas as any });

        });
      this.setData({ windowsSync, workspaceSync, linksSync }, { windowsSync, workspaceSync, linksSync });
    }

    this.checkIfNoOpenWindows();

    const needToRecalculateCounds = delta.workspace && "hideCounts" in delta.workspace;
    const schemaChanged = this.props.prgl.dbKey !== this.loadingSchema?.dbKey; //  !this.loadingSchema?.dbKey.startsWith(FORCED_REFRESH_PREFIX) && 
    const dataWasImported = !!delta.imported;
    if(
      workspace && 
      (schemaChanged || needToRecalculateCounds || dataWasImported)
    ){
      this.loadSchema();
    }

    if(dd){
      ["windows", "workspace", "links"].map(key => {
        if(dd[key]) ns[key] = { ...dd[key] }
      });
      if(isEmpty(ns) && dd.windowsSync){
        ns = { reRender: Date.now() };
      }
    }
    if(!isEmpty(ns)){
      this.setState(ns as any)
    }
  }


  loadTable = async (args: { type: "sql" | "table" | "method"; table?: string; fullscreen?: boolean; filter?: SmartGroupFilter; sql?: string, name?: string; method_name?: string; }): Promise<string> => {
    const { db, dbs } = this.props.prgl;
    const { workspace } = this.d;

    const { type, table = null, filter = [], sql = "", name = table, method_name } = args;
    let options: WindowData["options"] = { hideTable: true };
    // const { queries } = this.state;
    let table_oid: number | undefined;
    if(table){
      const tableHandler = db[table]
      if(tableHandler?.getInfo){
        if("getInfo" in tableHandler){
          const info = await tableHandler.getInfo();
          table_oid = info.oid;
        }
        options = {
          maxCellChars: 500
        }
      } else {
        const err = db[table]? "Not allowed to view data from this table" : "Table not found";
        alert(err);
        throw err;
      }
    }

    const r: WindowData = await dbs.windows.insert(
      {
        sql, filter, options, type, table_name: table, 
        table_oid,
        name,
        method_name,
        layout: getDefaultLayout("111"), 
        fullscreen: false, 
        workspace_id: workspace?.id,
      } as any,
      { returning: "*" }
    ) as any;
    return r.id;
  }
  

  getNamePopupWindow(): PopupProps | undefined {

    const nw = this.state.namePopupWindow;

    const namePopupWindow = nw? this.d.windows.find(w => w.id === nw.w.id) : null;
    if(namePopupWindow && nw){
      const onClose = () => this.setState({ namePopupWindow: undefined });
      return {
        title: "Save query?",
        onClose,
        anchorEl: nw.node,
        positioning: "beneath-left",
        clickCatchStyle: { opacity: .2 },
        content: (
          <div className="flex-col">

            <FormField type="text"
              asColumn={true}
              label="Name" 
              defaultValue={namePopupWindow.name} 
              required={true} 
              onChange={(v) => {
                namePopupWindow.$update({ name: v, options: { sqlWasSaved: true } }, { deepMerge: true }) 
              }}
            />
            <div className="flex-row-wrap w-full mt-2 gap-1" >

              <Btn className="mr-2" 
                variant="outline" 
                color="danger"
                iconPath={mdiDelete} 
                onClick={async () => {
                  namePopupWindow.$update({ closed: true, deleted: true })
                  onClose();
                }}>Delete</Btn>

              <Btn variant="filled" color="action"  
                iconPath={mdiContentSave} 
                onClick={() => {
                  if(!namePopupWindow.name) alert("Cannot have an empty name");
                  else namePopupWindow.$update({ closed: true, deleted: false, options: { sqlWasSaved: true } }, { deepMerge: true });
                  setTimeout(() => {
                    onClose()
                  }, 500)

                }}>Save</Btn>
            </div>
          </div>
        )
      }
    }

    return undefined;
  }

  checkedIfNoOpenWindows = false;
  checkIfNoOpenWindows = async () => {
    const {workspaceId, prgl: { dbs} } = this.props;
    if(workspaceId){
      this.checkedIfNoOpenWindows = true;
      const hasOpenWindows = (await dbs.windows.findOne({ workspace_id: workspaceId, closed: false }));
      if(!hasOpenWindows){
        const menuBtn = document.querySelector<HTMLButtonElement>(`[data-command="menu"]`);
        menuBtn?.click();
      }
    }
  }

  /**
   * Used to reduce useless re-renders
   */
  menuAnchorState = createReactiveState<HTMLElement | undefined>();

  isOk = false;
  render(){
    
    const { 
      localSettings, prgl
    } = this.props;
    const { connectionId } = prgl
    const { 
      tables, loading, isReadonly, 
      suggestions, wspError, error
    } = this.state;
  
    const { centeredLayout } = localSettings;

    if(wspError || error){
      const errorNode = wspError? <>Workspace not found <a className='text-white' href={`/connections/${connectionId}`}>Go back</a></> : <ErrorComponent error={error} />
      return <div className="flex-col p-1 text-white">
        {errorNode}
      </div>
    }
  
    const { windowsSync, workspace } = this.d;
   
    let mainContent: React.ReactNode;

    if(!windowsSync || !workspace || !tables){
      let loadingMessage = "";
      if(!windowsSync || !workspace) {
        loadingMessage = "Loading dashboard...";
      } else if(!tables){
        loadingMessage = "Loading schema..."
      }
      
  
      return <div className="absolute flex-row bg-0 " style={{ inset: 0 }}>
        <Loading id="main"
          message={loadingMessage} 
          className="m-auto" 
          refreshPageTimeout={5000}
        />
      </div>;
    }

    
    if(connectionId) {
      mainContent = <ViewRendererWrapped 
        key={prgl.dbKey}
        isReadonly={isReadonly}
        prgl={prgl}
        workspace={workspace} 
        loadTable={this.loadTable} 
        links={this.d.links} 
        windows={this.d.windows} 
        tables={tables}
        onCloseUnsavedSQL={(q, e)=> {
          this.setState({ namePopupWindow: { w: q, node: e.currentTarget } })
        }}
        suggestions={suggestions}
      />;
    }

    this.isOk = true;
    const popup = this.getNamePopupWindow();

    const pinnedMenu = workspace.options.pinnedMenu && !window.isLowWidthScreen;
    const dashboardMenu = <DashboardMenu
        menuAnchorState={this.menuAnchorState}
        prgl={prgl}
        suggestions={suggestions} 
        loadTable={this.loadTable} 
        tables={tables} 
        workspace={workspace}
      />;
    const pinnedDashboardMenu = pinnedMenu? dashboardMenu : null;
    // const popupDashboard = pinnedDashboard? <DashboardMenuBtn disabledInfo="Pinned below" pinnedProps={{ user, connection }} /> : dashboardMenu;
    const popupDashboardMenu = pinnedDashboardMenu? null : dashboardMenu;

    const centeredEdgeStyle: React.CSSProperties | undefined = !centeredLayout?.enabled? undefined : { 
      flex: pinnedDashboardMenu? .5 : 0, 
      minWidth: pinnedDashboardMenu? "200px" : 0,
      width: `calc((100% - ${centeredLayout.maxWidth}px)/2)`,
      overflow: "hidden",
      display: "flex",
      // flexDirection: "column",
      // width: ((window.innerWidth - centeredLayout.maxWidth)/2) + "px" 
    }
    const centeredWidth = !centeredLayout?.enabled? undefined : centeredLayout.maxWidth + "px";
    const centerStyle: React.CSSProperties | undefined = !centeredWidth? undefined : {
      flex: 1000,
      minWidth: 0,
      width: centeredWidth,
      maxWidth: centeredWidth,
      // marginLeft: "auto",
      margin: "0 auto",
    }

    return (
      <FlexCol className={"Dashboard gap-0 f-1 min-w-0 min-h-0 w-full "} 
        style={{ 
          maxWidth: "100vw", 
          opacity: connectionId? 1 : 0, 
          transition: "opacity .5s",
          ...(centeredLayout && {"--centered-width": centeredLayout.maxWidth })
        }}
      >

        <div className={`${TopHeaderClassName} f-0 flex-row  min-h-0 min-w-0 o-hidden`}>
          <>
            {popupDashboardMenu}
          </>
          <TopControls 
            onClick={e => {
              this.menuAnchorState.set(e.currentTarget);
            }}
            location="workspace" 
            pinned={pinnedMenu}
            prgl={this.props.prgl}
            workspace={workspace}
          />
        </div>


        {popup &&
          <Popup { ...popup}>
            {popup.content}
          </Popup>
        }

        <div className="Dashboard_Wrapper min-h-0 f-1 flex-row relative" style={{ gap: "1px" }}>
          <div style={centeredEdgeStyle}>{pinnedDashboardMenu}</div>

          <div style={centerStyle} className="Dashboard_MainContentWrapper f-1 flex-row relative">
            {/* <DragOverUpload onOpen={console.error} /> */}
            {mainContent}
          </div>

          <div style={{
            ...centeredEdgeStyle, 
            /** Ensure right section shrinks to 0 if the left dashboard menu is pinned and we have a centered layout */
            ...(!!pinnedDashboardMenu && {minWidth: 0})
          }}></div>
        </div>

        {loading? (<Loading className="p-2" />) : null }

      </FlexCol>
    );
  }
}

export const Dashboard = (p: Omit<DashboardProps, "localSettings" | "navigate">) => {
  const localSettings = useLocalSettings();
  const navigate = useNavigate();
  return <_Dashboard {...p} localSettings={localSettings} navigate={navigate} />
}

export type ValueOf<T> = T[keyof T];


export function isEmpty(obj: any){
  for (const field in obj ) return false;
  return true;
}

export type CommonWindowProps<T extends ChartType = ChartType> = Pick<DashboardProps, "prgl"> & {
  key: string;
  "data-key": string;
  "data-table-name": string | null;
  "data-title": string;
  w: WindowSyncItem<T>;
  getLinksAndWindows: () => { links: LinkSyncItem[]; windows: WindowSyncItem<ChartType>[]; };
  /**
   * e is undefined when the table window was closed due to dropped table
   */
  onClose: (e: React.MouseEvent<HTMLButtonElement, MouseEvent> | undefined) => any;
  /**
   * used to force re-render after links changed
   */
  onForceUpdate: () => void;
  titleIcon?: React.ReactNode;
  tables: Required<DashboardState>["tables"];
  isReadonly: boolean;
  suggestions: LoadedSuggestions | undefined;
  myLinks: LinkSyncItem[];
  onAddChart: OnAddChart;
  active_row: ActiveRow | undefined;
} & Pick<ViewRendererProps, "searchParams" | "setSearchParams">