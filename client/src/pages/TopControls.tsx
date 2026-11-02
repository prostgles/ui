import { USER_TYPES } from "@common/authTypesAndConstants";
import { mdiArrowLeft, mdiDatabaseCog, mdiMagnify } from "@mdi/js";
import React from "react";
import type { Prgl } from "../App";
import { dataCommand } from "../Testing";
import type { BtnProps } from "@components/Btn";
import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import { ConnectionSelector } from "../dashboard/ConnectionSelector";
import type {
  LoadedSuggestions,
  WorkspaceSyncItem,
} from "../dashboard/Dashboard/dashboardUtils";
import { WorkspaceMenu } from "../dashboard/WorkspaceMenu/WorkspaceMenu";
import { WorkspaceLayoutToggle } from "../dashboard/WorkspaceMenu/WorkspaceLayoutToggle";
import { AppVideoDemo } from "../demo/AppVideoDemo";
import { Alerts } from "./Alerts";
import { AskLLM } from "../dashboard/AskLLM/AskLLM";
import { ROUTES } from "@common/utils";
import { t } from "../i18n/i18nUtils";
import { AccountMenu } from "./AccountMenu";
import { canManageBusinessAccess } from "@common/authTypesAndConstants";

type TopControlsProps = {
  prgl: Prgl;
  loadedSuggestions: LoadedSuggestions | undefined;
} & (
  | {
      location: "workspace";
      pinned: boolean | undefined;
      workspace: WorkspaceSyncItem;
      onClick: Required<BtnProps>["onClick"];
      onClickSearchAll: VoidFunction;
    }
  | { location: "config" }
);
export const TopControls = (props: TopControlsProps) => {
  const { prgl, location, loadedSuggestions } = props;
  const { connectionId } = prgl;
  const { data: connections } = prgl.dbs.connections.useSubscribe(
    {},
    { select: ["id"] },
  );
  const menuBtnProps: DashboardMenuBtnProps<any> =
    props.location === "config" ?
      {
        ...dataCommand("config.goToConnDashboard"),
        title: t.TopControls["Go to workspace"],
        asNavLink: true,
        href: `${ROUTES.CONNECTIONS}/${connectionId}`,
      }
    : {
        ...dataCommand("dashboard.menu"),
        className: props.pinned ? t.TopControls.pinned : "",
        disabledInfo:
          props.pinned ? t.TopControls["Menu is pinned"] : undefined,
        onClick: props.onClick,
      };

  const wrapIfNeeded = (content: React.ReactNode) => {
    if (props.location !== "config") return content;
    return <FlexRow className="gap-0 max-w-1200 f-1">{content}</FlexRow>;
  };

  return (
    <FlexRow
      className={`TopControls w-full bg-color-0 jc-center shadow pr-p5`}
      style={{ zIndex: 1 }}
    >
      {wrapIfNeeded(
        <>
          <FlexRow className={`max-w-fit f-1 gap-p5 ai-center p-p25`}>
            <DashboardMenuBtn {...menuBtnProps} />
            <ConnectionConfigBtn {...prgl} location={location} />
            {connections &&
              connections.length > 1 &&
              !window.isMobileDevice && (
                <ConnectionSelector {...prgl} location={location} />
              )}
          </FlexRow>

          {props.location === "workspace" && (
            <>
              <WorkspaceMenu {...props} variant="select" onClose={undefined} />
              <WorkspaceLayoutToggle
                workspace={props.workspace}
                variant="top-controls"
              />
            </>
          )}
          <FlexRow
            className={`ml-auto min-w-0 f-0 ai-center gap-p5 text-1p5 w-fit noselect o-auto no-scroll-bar jc-end`}
            style={{
              maxWidth: "100%",
            }}
          >
            {props.location === "workspace" && (
              <Btn
                data-command="dashboard.menu.quickSearch"
                iconPath={mdiMagnify}
                variant="outline"
                style={{
                  color: "var(--text-2)",
                  borderRadius: "999px",
                }}
                title="Search (Ctrl+K)"
                onClick={props.onClickSearchAll}
              >
                <span className="f-1 ta-left">Search... (Ctrl+K)</span>
              </Btn>
            )}

            {location === "workspace" && <AppVideoDemo />}

            <Alerts />

            <AskLLM
              loadedSuggestions={loadedSuggestions}
              workspaceId={
                props.location === "workspace" ? props.workspace.id : undefined
              }
            />

            {(prgl.user?.type === USER_TYPES.ADMIN ||
              connections?.length !== 1) && (
              <Btn
                data-command="dashboard.goToConnections"
                title={t.TopControls["Go to Connections"]}
                href={ROUTES.CONNECTIONS}
                variant="faded"
                asNavLink={true}
                iconPath={mdiArrowLeft}
              />
            )}
            <AccountMenu user={prgl.auth.user} />
          </FlexRow>
        </>,
      )}
    </FlexRow>
  );
};

type ConnectionConfigBtnProps = Prgl & {
  location: "workspace" | "config";
};
export const ConnectionConfigBtn = (props: ConnectionConfigBtnProps) => {
  const { connection, location } = props;
  const canManageMembers = canManageBusinessAccess(props.user?.type);
  if (!canManageMembers) return null;
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
            `${ROUTES.CONFIG}/${connection.id}`
          : `${ROUTES.CONNECTIONS}/${connection.id}`
        }
        asNavLink={true}
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
