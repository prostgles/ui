import { mdiAccountMultiple } from "@mdi/js";
import React from "react";
import { NavLink } from "react-router-dom";
import { ROUTES } from "../../../../common/utils";
import type { ExtraProps } from "../../App";
import Btn from "../../components/Btn";
import { FlexCol, FlexRowWrap } from "../../components/Flex";
import { Icon } from "../../components/Icon/Icon";
import { InfoRow } from "../../components/InfoRow";
import { WspIconPath } from "../../dashboard/AccessControl/ExistingAccessRules";
import { t } from "../../i18n/i18nUtils";
import { ConnectionActionBar } from "./ConnectionActionBar";
import type {
  AdminConnectionModel,
  BasicConnectionModel,
} from "./useConnections";

export type ConnectionProps = (
  | {
      connection: AdminConnectionModel;
      isAdmin: true;
    }
  | {
      connection: BasicConnectionModel;
      isAdmin: false;
    }
) &
  Pick<ExtraProps, "dbs" | "dbsMethods" | "dbsTables" | "theme"> & {
    showDbName: boolean;
  };

const getConnectionPath = (connectionId: string, wid?: string) =>
  `${ROUTES.CONNECTIONS}/${connectionId}` + (wid ? `?workspaceId=${wid}` : "");

export const Connection = (props: ConnectionProps) => {
  const { connection, isAdmin } = props;
  const noWorkspaceAndCannotCreateOne =
    !connection.workspaces.length && !(props.dbs.workspaces as any).insert;

  if (noWorkspaceAndCannotCreateOne) {
    return (
      <InfoRow className="shadow bg-color-0">
        <strong>{connection.id}</strong>
        <div>
          Issue with connection permissions: No published workspace and not
          allowed to create workspaces
        </div>
      </InfoRow>
    );
  }

  const showWorkspaces =
    !!connection.workspaces.length &&
    connection.workspaces.map((w) => w.name).join("") !== "default";

  const showAccessInfo = isAdmin && connection.access_control.length > 0;

  /** Remove published workspaces that have been cloned
   * TODO: remove workspaces from other users
   */
  const workspaces = connection.workspaces.filter((w) => {
    return !connection.workspaces.some(
      (pw) => pw.id === w.parent_workspace_id && pw.name === w.name,
    );
  });

  return (
    <FlexCol
      key={connection.id}
      className={"Connection gap-0 bg-color-0 text-black shadow trigger-hover "}
      style={{ minWidth: "250px" }}
      data-key={connection.name}
    >
      <div className="Connection_TOP-CONNECTION-INFO_ACTIONS flex-row">
        <NavLink
          key={connection.id}
          className={
            "no-decor flex-col min-w-0 text-ellipsis f-1 text-active-hover "
          }
          data-command="Connection.openConnection"
          to={getConnectionPath(connection.id)}
        >
          <div className="flex-col gap-p5 p-1 h-full">
            <FlexRowWrap className="gap-1">
              <div
                className="text-ellipsis font-20 text-0"
                title={(isAdmin ? connection.db_name : connection.name) || ""}
              >
                {isAdmin ? connection.name : connection.name || connection.id}
              </div>
              {isAdmin && !!props.showDbName && (
                <div
                  title="Database name"
                  className="text-2 text-ellipsis font-16"
                >
                  {connection.db_name}
                </div>
              )}
            </FlexRowWrap>
            {isAdmin && connection.is_state_db && (
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
          data-command="Connection.workspaceList"
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
                  data-key={w.name}
                  color="action"
                  asNavLink={true}
                  href={getConnectionPath(connection.id, w.id)}
                >
                  {w.name || <em>Workspace</em>}
                </Btn>
              ))}
            </>
          )}

          {showAccessInfo && (
            <Btn
              className="as-end ml-auto"
              title={`${t.Connections["Access granted to "]}${pluralisePreffixed(connection.allowedUsers, "user")} `}
              iconPath={mdiAccountMultiple}
              iconPosition="right"
              color="action"
              asNavLink={true}
              href={`${ROUTES.CONFIG}/${connection.id}?section=access_control`}
            >
              {connection.allowedUsers}
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
