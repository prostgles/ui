import { mdiArrowLeft,  mdiDatabaseCog, mdiTable } from "@mdi/js"
import React from "react";
import Btn, { BtnProps } from "../components/Btn"  
import { Feedback } from "../dashboard/Feedback"
import { FlexRow } from "../components/Flex"
import { ConnectionSelector } from "../dashboard/ConnectionSelector"
import { Connections, FullExtraProps } from "./Project";
import { dataCommand } from "../Testing"
import { WorkspaceMenu } from "../dashboard/WorkspaceMenu/WorkspaceMenu"
import { WorkspaceSyncItem } from "../dashboard/Dashboard/dashboardUtils"
import { Prgl } from "../App"

type TopControlsProps = {
  prgl: Prgl;
} & (
  | { 
    location: "workspace"; 
    pinned: boolean | undefined; 
    workspace: WorkspaceSyncItem;
    onClick: Required<BtnProps>["onClick"] 
  }
  | { location: "config"; }
)
export const TopControls = (props: TopControlsProps) => {
  
  const { prgl, location } = props;
  const { connectionId } = prgl;
  const commonBtnStyle: React.CSSProperties = {
    color: "var(--gray-100)",
    background: "var(--gray-700)"
  }

  const menuBtnProps: DashboardMenuBtnProps<any> = props.location === "config"? {
    ...dataCommand("config.goToConnDashboard"),
    title: "Go to workspace",
    asNavLink: true, 
    href: `/connections/${connectionId}`,
    style: {
      background: "var(--gray-400)"
    }
  } : {
    ...dataCommand("dashboard.menu"),
    onClick: props.onClick,
  }

  return ( 
    <FlexRow className={`TopControls w-full ${(window.isMobileDevice? " p-p25 " : " p-p5 ")} `}>

      <FlexRow className="f-0 ai-center">
        <DashboardMenuBtn {...menuBtnProps} />
        <ConnectionConfigBtn {...prgl} location={location}  />
        {!window.isMobileDevice && 
          <ConnectionSelector { ...prgl } location={location} />
        }
        {props.location === "workspace" && 
          <WorkspaceMenu { ...props } />
        }
      </FlexRow>

      <FlexRow 
        className="min-w-0 f-1 ai-start gap-1 text-1p5 w-fit ai-center noselect o-auto no-scroll-bar jc-end" 
        style={{ 
          maxWidth: "100%" 
        }}
      >
      
        <Feedback />

        {/* <AccountMenu user={user} /> */}
      
        <Btn 
          title="Go to Connections"  
          href={`/connections`} 
          asNavLink={true} 
          // size={window.isLowWidthScreen? undefined : "small"} 
          className="text-white bg-gray-700 " 
          style={commonBtnStyle}
          iconPath={mdiArrowLeft}
        >
          {window.isMediumWidthScreen? null : `Connections`}
        </Btn>

      </FlexRow>
    </FlexRow>
  );
}


type ConnectionConfigBtnProps = Pick<FullExtraProps, "user"> & { connection: Connections; location: "workspace" | "config" }
export const ConnectionConfigBtn = ({ user, connection, location }: ConnectionConfigBtnProps) => {

  // const serverNameText = sliceText(connection.name || connection.db_host || "", 15);
  const isOnWorkspace = location === "workspace"
  return <div className="h-full flex-col gap-p25 ai-start text-gray-400">
    {user?.type === "admin"? 
      <Btn title={isOnWorkspace? "Configure database connection" : "Go back to connection workspace"}  
        { ...dataCommand("dashboard.goToConnConfig") }
        style={isOnWorkspace? {
          color: "var(--gray-100)",
          background: "var(--gray-700)"
        } : {
          color: "var(--gray-700)",
          background: "white"
        }}
        className="ConnectionConfigBtn bg-gray-700 text-white b g-gray-700" 
        iconPath={mdiDatabaseCog} 
        href={isOnWorkspace? `/connection-config/${connection.id}` : `/connections/${connection.id}`} 
        asNavLink={true} 
        disabledInfo={connection.is_state_db? "Not allowed for state database" : undefined} 
        children={isOnWorkspace? null : "Connection configuration"}
      /> : 
      !window.isLowWidthScreen && <>
      <div className="text-gray-300  text-ellipsis"> </div>
    </>}
  </div>
}

type DashboardMenuBtnProps<HREF extends string | void> = BtnProps<HREF>;
export const DashboardMenuBtn = <HREF extends string | void>({  ...props }: DashboardMenuBtnProps<HREF>) => {

  return <Btn title="Menu"
    { ...dataCommand("dashboard.menu") }
    {...props}
    id="dashboard-menu-button"
    style={{ 
      borderRadius: "4px", 
      padding: "2px",
      ...props.style
    }} 
  >
    <img src="/prostgles-logo.svg"/>
  </Btn>;

}