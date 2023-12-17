import { mdiAccountMultiple, mdiViewCarousel } from '@mdi/js';
import Icon from '@mdi/react';
import { SyncDataItem } from 'prostgles-client/dist/SyncedTable';
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Prgl } from '../../App';
import Btn from "../../components/Btn";
import { FlexCol } from '../../components/Flex';
import PopupMenu from '../../components/PopupMenu';
import SearchList from '../../components/SearchList';
import { onWheelScroll } from "../../components/Table/Table";
import { WspIconPath } from "../AccessControl/ExistingAccessRules";
import { useIsMounted } from '../Backup/CredentialSelector';
import { Workspace, WorkspaceSyncItem } from '../Dashboard/dashboardUtils';
import { useEffectAsync } from '../DashboardMenu/DashboardMenuSettings';
import { WorkspaceAddBtn } from "./WorkspaceAddBtn";
import { WorkspaceDeleteBtn } from "./WorkspaceDeleteBtn";
import "./WorkspaceMenu.css";
import { WorkspaceSettings } from "./WorkspaceSettings";

// type P = DashboardProps & {
type P = {
  workspace: WorkspaceSyncItem; //SyncDataItem<Workspace>;
  prgl: Prgl;
}

export const WorkspaceMenu = (props: P) => {
  const { workspace, prgl: { dbs, dbsTables, dbsMethods } } = props;

  const [workspaces, setWorkspaces] = useState<SyncDataItem<Workspace>[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const getIsMounted = useIsMounted();
  useEffectAsync(async () => {
    const workspacesSync = await dbs.workspaces.sync?.(
      { connection_id: workspace.connection_id, deleted: false },
      { handlesOnData: true, select: "*", patchText: false },
      (workspaces, deltas) => {
        if (!getIsMounted()) return;

        setWorkspaces(workspaces);

        setTimeout(() => {
          listRef.current?.querySelector("li.active")?.scrollIntoView()
        }, 100)
      }
    );
    return () => workspacesSync?.$unsync();
  }, [dbs, listRef.current, workspace.connection_id]);

  const navigate = useNavigate();
  const setWorkspace = (w?: Workspace) => {
    if(w?.id && w.id === props.workspace.id){
      return;
    }
    const path = ["/connections", `${w?.connection_id}?workspaceId=${w?.id}`].filter(v => v).join("/");
    
    navigate(path);
  }

  const WorkspaceMenuDropDwon = <PopupMenu
    title="Workspaces"
    rootStyle={{
      maxHeight: `100%`,
      marginRight: "1em"
    }}
    positioning="beneath-left"
    button={
      <Btn 
        title="Manage Workspaces" 
        iconPath={WspIconPath} 
        className={"ml-1 text-gray-300" + (window.isLowWidthScreen? "text-gray-100" : "")}
        data-command="WorkspaceMenuDropDwon"
        style={{ 
          padding: "8px",
          ...(window.isLowWidthScreen && {
            background: "var(--gray-600)",
            color: "white",
          })
        }}
        children={window.isLowWidthScreen? workspaces.find(w => w.id === workspace.id)?.name : undefined }
      />
    }
    contentStyle={{
      overflow: "hidden",
      padding: 0,
      borderRadius: 0,
    }}
    render={closePopup => (
      <FlexCol 
        className={"flex-col f-1 min-h-0 gap-0"}
        style={{ paddingTop: 0 }}
        onKeyDown={e => {
          if (e.key === "Escape") {
            closePopup()
          }
        }}
      >
        {!workspaces.length? <div className="text-gray-400">No other workspaces</div> :
          <SearchList
            id="search-list-queries"
            data-command="WorkspaceMenu.SearchList"
            className={" b-t f-1 min-h-0 "}
            style={{ minHeight: "120px", maxHeight: "30vh" }}
            placeholder={"Workspaces"}
            items={workspaces.sort((a, b) => +b.last_updated! - +a.last_updated!)
              .map((w) => ({
                key: w.name,
                label: w.name,
                labelStyle: {},
                rowStyle: workspace.id === w.id ? { 
                  background: "var(--blue-50)",
                } : {},
                contentLeft: (
                  <div className="flex-col ai-start f-0 mr-1 text-gray-400" 
                    style={workspace.id === w.id? { color: "var(--active)" } : undefined}
                  >
                    <Icon path={mdiViewCarousel} size={1} />
                  </div>
                ),
                contentRight: (<div className="flex-row gap-p5 pl-1 show-on-parent-hover">
                  {w.published && <Btn 
                    title="Published" 
                    iconPath={mdiAccountMultiple} 
                    color="action" 
                    asNavLink={true} 
                    href={`/connection-config/${w.connection_id}?section=access_control`} 
                  />}
                  <WorkspaceDeleteBtn w={w} dbs={props.prgl.dbs} activeWorkspaceId={workspace.id} />
                  <WorkspaceSettings w={w} theme={props.prgl.theme} dbs={props.prgl.dbs} dbsTables={dbsTables} dbsMethods={dbsMethods} />
                </div>),
                onPress: (e) => {
                  if(w.id === props.workspace.id ||
                    (e.target as Element | null)?.closest(".delete-workspace") ||
                    (e.target as Element | null)?.closest(".workspace-settings") ||
                    (e.target as Element | null)?.closest(".clickcatchcomp") 
                  ) return;

                  setWorkspace(w);
                  closePopup();
                }
              }))
            }
          />
        }

      </FlexCol>
    )}
    footer={closePopup => (
      <WorkspaceAddBtn  
        dbs={props.prgl.dbs} 
        connection_id={workspace.connection_id} 
        setWorkspace={setWorkspace} 
        closePopup={closePopup}
        btnProps={{
          children: "New workspace",
          "data-command": "WorkspaceMenuDropDwon.WorkspaceAddBtn",
        }}
      />
    )}
  />

  const renderedWorkspaces = workspaces;
  return <div 
    ref={listRef}
    className="flex-row jc-center text-white ai-start f-1  min-w-0 o-auto h-fit" 
    style={{ 
      gap: "1px",
      // marginLeft: window.isLowWidthScreen? undefined : "2em"
    }}
  >
    {WorkspaceMenuDropDwon}
    {!window.isLowWidthScreen && <>
      <ul className={"o-auto f-1 min-w-0 max-w-fit flex-row no-scroll-bar "} onWheel={onWheelScroll()}>
        {renderedWorkspaces.map(w => 
          (<li key={w.id} 
            className={"workspace-list-item relative " + (workspace.id === w.id? "active" : "")}
          >
            <Btn
              style={{
                ...(workspace.id !== w.id? {
                  color: "var(--gray-300)",
                  background: "var(--gray-700)",
                } : {
                  color: "white",
                  fontWeight: 600,
                  background: "var(--gray-600)",
                }),
                borderRadius: 0,
                whiteSpace: "nowrap",
              }}
              onClick={() => {
                setWorkspace(w)
              }}
            >
              {w.name}
            </Btn>
          </li>)
      )}
      </ul>
      {!!(dbs.workspaces as any).insert && <div 
        key={"add-btn"} 
        className="add-wsp-btn flex-col ai-center h-full"
        style={{
          // padding: "6px"
        }}
      >
        <WorkspaceAddBtn  
          dbs={props.prgl.dbs} 
          connection_id={workspace.connection_id} 
          setWorkspace={setWorkspace} 
          closePopup={() => {}} 
          className="flex-col f-1 ai-center"
          btnProps={{
            variant: "default",
            "data-command": "WorkspaceMenu.WorkspaceAddBtn",
            color: undefined,
            style: { 
              flex: !window.isMobileDevice? 1 : undefined, 
              borderRadius: 0,
              color: `white`
            }
          }}
        />
      </div>}
    </>}
  </div>
}