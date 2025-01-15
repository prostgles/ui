import { mdiArrowLeft, mdiDatabaseCog } from "@mdi/js";
import React from "react";
import type { Prgl } from "../App";
import { dataCommand } from "../Testing";
import type { BtnProps } from "../components/Btn";
import Btn from "../components/Btn";
import { FlexRow } from "../components/Flex";
import { ConnectionSelector } from "../dashboard/ConnectionSelector";
import { getIsPinnedMenu } from "../dashboard/Dashboard/Dashboard";
import type { WorkspaceSyncItem } from "../dashboard/Dashboard/dashboardUtils";
import { Feedback } from "../dashboard/Feedback";
import { WorkspaceMenu } from "../dashboard/WorkspaceMenu/WorkspaceMenu";
import { AppVideoDemo } from "../demo/AppVideoDemo";
import { Alerts } from "./Alerts";
import type {
  Connections,
  FullExtraProps,
} from "./ProjectConnection/ProjectConnection";
import { AskLLM } from "../dashboard/AskLLM/AskLLM";
import { API_PATH_SUFFIXES } from "../../../commonTypes/utils";
import { t } from "../i18n/i18nUtils";

type TopControlsProps = {
  prgl: Prgl;
} & (
  | {
      location: "workspace";
      pinned: boolean | undefined;
      workspace: WorkspaceSyncItem;
      onClick: Required<BtnProps>["onClick"];
    }
  | { location: "config" }
);
export const TopControls = (props: TopControlsProps) => {
  const { prgl, location } = props;
  const { connectionId, connection: c } = prgl;
  const menuBtnProps: DashboardMenuBtnProps<any> =
    props.location === "config" ?
      {
        ...dataCommand("config.goToConnDashboard"),
        title: t.TopControls["Go to workspace"],
        asNavLink: true,
        href: `${API_PATH_SUFFIXES.DASHBOARD}/${connectionId}`,
      }
    : {
        ...dataCommand("dashboard.menu"),
        className: getIsPinnedMenu(props.workspace) ? t.TopControls.pinned : "",
        disabledInfo:
          getIsPinnedMenu(props.workspace) ?
            t.TopControls["Menu is pinned"]
          : undefined,
        onClick: props.onClick,
      };

  const wrapIfNeeded = (content: React.ReactNode) => {
    if (props.location !== "config") return content;
    return <FlexRow className="gap-0 max-w-1200 f-1">{content}</FlexRow>;
  };

  const paddingClass = window.isMobileDevice ? " p-p25 " : " p-p5 ";
  return (
    <FlexRow
      className={`TopControls w-full bg-color-0 jc-center shadow`}
      style={{ zIndex: 1 }}
    >
      {wrapIfNeeded(
        <>
          <FlexRow className={`max-w-fit f-1 ai-center ${paddingClass}`}>
            <DashboardMenuBtn {...menuBtnProps} />
            <ConnectionConfigBtn {...prgl} location={location} />
            {!window.isMobileDevice && (
              <ConnectionSelector {...prgl} location={location} />
            )}
          </FlexRow>

          {props.location === "workspace" && <WorkspaceMenu {...props} />}
          <FlexRow
            className={`ml-auto min-w-0 f-0 ai-start gap-1 text-1p5 w-fit ai-center noselect o-auto no-scroll-bar jc-end ${paddingClass}`}
            style={{
              maxWidth: "100%",
            }}
          >
            {location === "workspace" && <AppVideoDemo {...prgl} />}

            {!!(prgl.dbs.alerts as any)?.subscribe && <Alerts {...prgl} />}

            {prgl.dbsMethods.askLLM && (
              <AskLLM
                {...prgl}
                workspaceId={
                  props.location === "workspace" ?
                    props.workspace.id
                  : undefined
                }
              />
            )}
            <Feedback dbsMethods={prgl.dbsMethods} />

            <Btn
              data-command="dashboard.goToConnections"
              title={t.TopControls["Go to Connections"]}
              href={API_PATH_SUFFIXES.DASHBOARD}
              variant="faded"
              asNavLink={true}
              iconPath={mdiArrowLeft}
            >
              {window.isMediumWidthScreen ? null : t.TopControls.Connections}
            </Btn>
          </FlexRow>
        </>,
      )}
    </FlexRow>
  );
};

type ConnectionConfigBtnProps = Pick<FullExtraProps, "user"> & {
  connection: Connections;
  location: "workspace" | "config";
};
export const ConnectionConfigBtn = ({
  user,
  connection,
  location,
}: ConnectionConfigBtnProps) => {
  const isAdmin = user?.type === "admin";
  if (!isAdmin) return null;
  const isOnWorkspace = location === "workspace";
  return (
    <div className="h-full flex-col gap-p25 ai-start ">
      <Btn
        title={
          isOnWorkspace ?
            t.TopControls["Configure database connection"]
          : t.TopControls["Go back to connection workspace"]
        }
        {...dataCommand("dashboard.goToConnConfig")}
        variant="faded"
        color={isOnWorkspace ? undefined : "action"}
        className="ConnectionConfigBtn"
        iconPath={mdiDatabaseCog}
        href={
          isOnWorkspace ?
            `${API_PATH_SUFFIXES.CONFIG}/${connection.id}`
          : `${API_PATH_SUFFIXES.DASHBOARD}/${connection.id}`
        }
        asNavLink={true}
        disabledInfo={
          connection.is_state_db ?
            t.TopControls["Not allowed for state database"]
          : undefined
        }
        children={
          isOnWorkspace ? null : t.TopControls["Connection configuration"]
        }
      />
    </div>
  );
};

type DashboardMenuBtnProps<HREF extends string | void> = BtnProps<HREF>;
export const DashboardMenuBtn = <HREF extends string | void>({
  ...props
}: DashboardMenuBtnProps<HREF>) => {
  return (
    <Btn
      title="Menu"
      {...dataCommand("dashboard.menu")}
      {...props}
      id="dashboard-menu-button"
      style={{
        borderRadius: "4px",
        padding: "2px",
        borderColor: "#3ad8e3",
        ...props.style,
      }}
    >
      <img src="/prostgles-logo.svg" />
    </Btn>
  );
};
