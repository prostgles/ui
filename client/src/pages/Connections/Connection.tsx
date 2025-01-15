import { mdiAccountMultiple } from "@mdi/js";
import React from "react";
import { NavLink } from "react-router-dom";
import type { ExtraProps, Prgl } from "../../App";
import Btn from "../../components/Btn";
import { FlexCol, FlexRowWrap } from "../../components/Flex";
import { Icon } from "../../components/Icon/Icon";
import { InfoRow } from "../../components/InfoRow";
import { WspIconPath } from "../../dashboard/AccessControl/ExistingAccessRules";
import { ConnectionActionBar } from "./ConnectionActionBar";
import type { AdminConnectionModel, BasicConnectionModel } from "./Connections";
import { API_PATH_SUFFIXES } from "../../../../commonTypes/utils";
import { t } from "../../i18n/i18nUtils";

export type ConnectionProps = (
  | {
      c: AdminConnectionModel;
      isAdmin: true;
    }
  | {
      c: BasicConnectionModel;
      isAdmin: false;
    }
) &
  Pick<ExtraProps, "dbs" | "dbsMethods" | "dbsTables" | "theme"> & {
    showDbName: boolean;
  };

const getConnectionPath = (cid: string, wid?: string) =>
  `${API_PATH_SUFFIXES.DASHBOARD}/${cid}` + (wid ? `?workspaceId=${wid}` : "");

export const Connection = (props: ConnectionProps) => {
  const { c, isAdmin } = props;
  const noWorkspaceAndCannotCreateOne =
    !c.workspaces.length && !(props.dbs.workspaces as any).insert;

  if (noWorkspaceAndCannotCreateOne) {
    return (
      <InfoRow className="shadow bg-color-0">
        <strong>{c.id}</strong>
        <div>
          Issue with connection permissions: No published workspace and not
          allowed to create workspaces
        </div>
      </InfoRow>
    );
  }

  const showWorkspaces =
    !!c.workspaces.length &&
    c.workspaces.map((w) => w.name).join("") !== "default";

  const showAccessInfo = isAdmin && c.access_control.length > 0;

  /** Remove published workspaces that have been cloned */
  const workspaces = c.workspaces.filter((w) => {
    return !c.workspaces.some(
      (pw) => pw.id === w.parent_workspace_id && pw.name === w.name,
    );
  });

  return (
    <FlexCol
      key={c.id}
      className={"Connection gap-0 bg-color-0 text-black shadow trigger-hover "}
      style={{ minWidth: "250px" }}
      data-key={c.name}
    >
      <div className="Connection_TOP-CONNECTION-INFO_ACTIONS flex-row  ">
        <NavLink
          key={c.id}
          className={
            "LEFT-CONNECTIONINFO no-decor flex-col min-w-0 text-ellipsis f-1 text-active-hover "
          }
          to={getConnectionPath(c.id)}
        >
          <div className="flex-col gap-p5 p-1 h-full">
            <FlexRowWrap className="gap-1">
              <div
                className="text-ellipsis font-20 text-0"
                title={(isAdmin ? c.db_name : c.name) || ""}
              >
                {isAdmin ? c.name : c.name || c.id}
              </div>
              {isAdmin && !!props.showDbName && (
                <div
                  title="Database name"
                  className="text-2 text-ellipsis font-16"
                >
                  {c.db_name}
                </div>
              )}
            </FlexRowWrap>
            {/* {isAdmin && <InfoRow className="text-1p5 font-18" variant="naked" iconPath={mdiDatabase} iconSize={.75}>
            {getServerInfo(c)}
          </InfoRow>} */}
            {/* {isAdmin && <InfoRow className="text-1p5 font-18" variant="naked" iconPath={mdiAccount} iconSize={.75}>
            {c.db_user}
          </InfoRow>} */}

            {isAdmin && c.is_state_db && (
              <InfoRow variant="naked" iconPath="" color="warning">
                {
                  t.Connection[
                    "All Prostgles connection and dashboard data is stored here. Edit at your own risk"
                  ]
                }
              </InfoRow>
            )}
          </div>
        </NavLink>

        <ConnectionActionBar {...props} />
      </div>

      {(showWorkspaces || showAccessInfo) && (
        <FlexRowWrap
          title={t.common["Workspaces"]}
          className="ConnectionWorkspaceList  pl-1 p-p25 pt-0 ai-center gap-0"
        >
          {showWorkspaces && (
            <>
              <Icon
                path={WspIconPath}
                size={0.75}
                className="text-action mr-p5"
              />
              {workspaces.map((w) => (
                <Btn
                  key={w.id}
                  className="w-fit"
                  color="action"
                  asNavLink={true}
                  href={getConnectionPath(c.id, w.id)}
                >
                  {w.name || <em>Workspace</em>}
                </Btn>
              ))}
            </>
          )}

          {showAccessInfo && (
            <Btn
              className="as-end ml-auto"
              title={`${t.Connections["Access granted to "]}${pluralisePreffixed(c.allowedUsers, "user")} `}
              iconPath={mdiAccountMultiple}
              iconPosition="right"
              color="action"
              asNavLink={true}
              href={`/connection-config/${c.id}?section=access_control`}
            >
              {c.allowedUsers}
            </Btn>
          )}
        </FlexRowWrap>
      )}
    </FlexCol>
  );
};

const pluralisePreffixed = (n: number, s: string) => {
  return `${n} ${pluralise(n, s)}`;
};

export const pluralise = (n: number, s: string) => {
  if ((n > 1 || n === 0) && !s.toLowerCase().endsWith("s")) {
    return s + "s";
  }

  return s;
};
