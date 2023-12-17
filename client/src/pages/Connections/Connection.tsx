import { mdiAccountMultiple, mdiChartLine, mdiCog, mdiLadybug, mdiPencil } from '@mdi/js';
import React from 'react';
import { NavLink } from 'react-router-dom';
import { ExtraProps } from "../../App";
import Btn from '../../components/Btn';
import { FlexCol, FlexRow, FlexRowWrap } from "../../components/Flex";
import { Icon } from '../../components/Icon/Icon';
import { InfoRow } from "../../components/InfoRow";
import PopupMenu from "../../components/PopupMenu";
import { WspIconPath } from '../../dashboard/AccessControl/ExistingAccessRules';
import { StatusMonitor } from "../../dashboard/StatusMonitor";
import { StatusDotCircleIcon } from "../Sessions";
import { AdminConnectionModel, BasicConnectionModel } from "./Connections";
  
type ConnectionProps = ({ 
  c: AdminConnectionModel; 
  isAdmin: true; 
} | {
  c: BasicConnectionModel; 
  isAdmin: false; 
}) & Pick<ExtraProps, "dbs" | "dbsMethods" | "dbsTables" | "theme"> & {
  showDbName: boolean;
}; 
   
const getConnectionPath = (cid: string, wid?: string) => `/connections/${cid}` + (wid? `?workspaceId=${wid}` : "");
 
export const Connection = (props: ConnectionProps) => {

  const { c, isAdmin, dbs, dbsMethods } = props;
  const noWorkspaceAndCannotCreateOne = !c.workspaces.length && !(props.dbs.workspaces as any).insert

  if(noWorkspaceAndCannotCreateOne) {
    return <InfoRow className="shadow bg-0">
      <strong>{c.id}</strong>
      <div>
        Issue with connection permissions: No published workspace and not allowed to create workspaces 
      </div>
    </InfoRow>;
  }

  const showWorkspaces = !!c.workspaces.length && c.workspaces.map(w => w.name).join("") !== "default";

  const showAccessInfo = isAdmin && c.access_control.length > 0;

  return <FlexCol
    key={c.id} 
    className={"Connection gap-0 bg-0 text-black shadow trigger-hover "} 
    style={{ minWidth: "250px" }} 
    data-key={c.name ?? ""}
  >     
    <div className="Connection_TOP-CONNECTION-INFO_ACTIONS flex-row  ">
      <NavLink key={c.id} className={"LEFT-CONNECTIONINFO no-decor flex-col min-w-0 text-ellipsis f-1 text-active-hover "} to={getConnectionPath(c.id)} >
        <div className="flex-col gap-p5 p-1 h-full">
          <FlexRowWrap className="gap-1">
            <div className="text-ellipsis font-20 text-0" title={(isAdmin? c.db_name : c.name) ?? ""}>{isAdmin? c.name : (c.name || c.id)}</div>
            {isAdmin && !!props.showDbName &&
              <div title="Database name" className="text-gray-400 text-ellipsis font-16">
                {c.db_name}
              </div>
            }
          </FlexRowWrap>  
          {/* {isAdmin && <InfoRow className="text-1p5 font-18" variant="naked" iconPath={mdiDatabase} iconSize={.75}>
            {getServerInfo(c)}
          </InfoRow>} */}
          {/* {isAdmin && <InfoRow className="text-1p5 font-18" variant="naked" iconPath={mdiAccount} iconSize={.75}>
            {c.db_user}
          </InfoRow>} */}
          
          {isAdmin && c.is_state_db && <InfoRow variant="naked" iconPath="" color="warning">All Prostgles connection and dashboard data is stored here. Edit at your own risk</InfoRow>}
        </div>
      </NavLink>

      <FlexRow className="ActionsContainer gap-p5 p-p25 ai-start">

        <FlexRow className="flex-row ai-center c--fit  show-on-trigger-hover">

          {dbsMethods.getStatus && <PopupMenu
            title={"Activity status: " + (c.name ?? c.id)}
            positioning="fullscreen"
            onClickClose={false}
            button={
              <Btn
                title="Status" 
                color={"action"}  
                iconPath={mdiChartLine}
              />
            }
          >
            <StatusMonitor 
              { ...props} 
              theme={props.theme}
              connectionId={c.id} 
              getStatus={dbsMethods.getStatus} 
            />
          </PopupMenu> }

          <Btn title="Close all windows" iconPath={mdiLadybug} 
            onClickPromise={async () => {
              // const wsp = await dbs.workspaces.findOne({ connection_id: c.id });
              const closed = await dbs.windows.update({ $existsJoined: { workspaces: { connection_id: c.id } } }, { closed: true }, { returning: "*" });
              if(closed){
                alert("Windows have been closed")
              } else {
                alert("Could not close windows: workspace not found")
              }
            }}
          />
          
          {isAdmin && !c.is_state_db && 
            <Btn href={"/connection-config/"+c.id} title="Configure" className=" " iconPath={mdiCog} asNavLink={true} color="action" />
          }

          {isAdmin && 
            <Btn 
              data-command="Connection.edit"
              href={"/edit-connection/"+c.id} 
              title="Edit connection" 
              className="  " 
              iconPath={mdiPencil} 
              asNavLink={true} 
              color="action"  
            />
          }

        </FlexRow>


        {dbsMethods.disconnect && !c.is_state_db && 
          <Btn 
            disabledInfo={!c.isConnected? "Not connected" : undefined} 
            disabledVariant="no-fade"
            title="Connected. Click to disconnect" 
            color={c.isConnected? "green" : undefined}
            className={c.isConnected? "" : "show-on-trigger-hover"}
            onClickPromise={async () => dbsMethods.disconnect!(c.id)}
            style={{
              // opacity: c.isConnected? undefined : 0,
              padding: "14px",
            }}
          >
            <StatusDotCircleIcon color={c.isConnected? "green": "gray"} />
          </Btn>
        }
      </FlexRow>
    </div>

    {(showWorkspaces || showAccessInfo) && 
      <FlexRowWrap 
        title="Workspaces"
        className="ConnectionWorkspaceList  pl-1 p-p25 pt-0 ai-center " 
      >
        {showWorkspaces && <>
          <Icon path={WspIconPath} size={.75} className="text-blue-500 mr-p5" />
          {c.workspaces.map(w => 
            <Btn key={w.id} 
              className="w-fit" 
              color="action" 
              asNavLink={true} 
              href={getConnectionPath(c.id, w.id)}
            >
              {w.name || <em>Workspace</em>}
            </Btn>
          )}
        </>}

        {showAccessInfo && <Btn className="as-end ml-auto"
            title={`Access granted to ${pluralisePreffixed(c.allowedUsers, "user")} `}
            iconPath={mdiAccountMultiple} 
            iconPosition="right"
            color="action" 
            asNavLink={true} 
            href={`/connection-config/${c.id}?section=access_control`} 
          >{c.allowedUsers}</Btn>}
      </FlexRowWrap>
    }
    
  </FlexCol>
}

const pluralisePreffixed = (n: number, s: string) => {
  return `${n} ${pluralise(n, s)}`
}

export const pluralise = (n: number, s: string) => {
  if((n > 1 || n === 0) && !s.toLowerCase().endsWith("s")){
    return s + "s";
  }

  return s;
}