import { ROUTES } from "@common/utils";
import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import PopupMenu from "@components/PopupMenu";
import {
  mdiChartLine,
  mdiCog,
  mdiDotsHorizontal,
  mdiLadybug,
  mdiPencil,
} from "@mdi/js";
import React from "react";
import { StatusMonitor } from "../../dashboard/StatusMonitor/StatusMonitor";
import { t } from "../../i18n/i18nUtils";
import { StatusDotCircleIcon } from "../Account/Sessions";
import type { ConnectionProps } from "./Connection";

export const ConnectionActionBar = (props: ConnectionProps) => {
  const { dbsMethods, connection, dbs, isAdmin } = props;

  const { isMobile } = window;

  const disconectButton = dbsMethods.disconnect && !connection.is_state_db && (
    <Btn
      title={t.ConnectionActionBar["Connected. Click to disconnect"]}
      disabledInfo={
        !connection.isConnected ?
          t.ConnectionActionBar["Not connected"]
        : undefined
      }
      data-command="Connection.disconnect"
      disabledVariant="no-fade"
      color={connection.isConnected ? "green" : undefined}
      className={connection.isConnected ? "" : "show-on-trigger-hover"}
      onClickPromise={async () => {
        await dbsMethods.disconnect!({ conId: connection.id });
      }}
      style={{
        padding: "14px",
      }}
    >
      <StatusDotCircleIcon color={connection.isConnected ? "green" : "gray"} />
    </Btn>
  );

  const buttons = (
    <>
      <Btn
        title={t.ConnectionActionBar["Close all windows"]}
        data-command="Connection.closeAllWindows"
        titleAsLabel={isMobile}
        iconPath={mdiLadybug}
        onClickPromise={async () => {
          // const wsp = await dbs.workspaces.findOne({ connection_id: c.id });
          const closed = await dbs.windows.update(
            { $existsJoined: { workspaces: { connection_id: connection.id } } },
            { closed: true },
            { returning: "*" },
          );
          if (closed) {
            alert(t.ConnectionActionBar["Windows have been closed"]);
          } else {
            alert(
              t.ConnectionActionBar[
                "Could not close windows: workspace not found"
              ],
            );
          }
        }}
      />
      {dbsMethods.getStatus && dbsMethods.runConnectionQuery && (
        <PopupMenu
          positioning="fullscreen"
          onClickClose={false}
          title={t.ConnectionConfig["Status monitor"]}
          data-command="Connection.statusMonitor"
          button={
            <Btn
              title={t.ConnectionConfig["Status monitor"]}
              titleAsLabel={isMobile}
              color={"action"}
              iconPath={mdiChartLine}
            />
          }
        >
          <StatusMonitor connectionId={connection.id} />
        </PopupMenu>
      )}

      {isAdmin && (
        <Btn
          href={ROUTES.CONFIG + "/" + connection.id}
          title={t.common["Configure"]}
          data-command="Connection.configure"
          titleAsLabel={isMobile}
          className=" "
          iconPath={mdiCog}
          asNavLink={true}
          color="action"
        />
      )}

      {isAdmin && (
        <Btn
          data-command="Connection.edit"
          href={ROUTES.EDIT_CONNECTION + "/" + connection.id}
          title={t.ConnectionActionBar["Edit connection"]}
          titleAsLabel={isMobile}
          className="  "
          iconPath={mdiPencil}
          asNavLink={true}
          color="action"
        />
      )}
    </>
  );

  const buttonBar =
    isMobile ?
      <PopupMenu
        button={
          <Btn
            size="default"
            iconPath={mdiDotsHorizontal}
            style={{
              padding: "11px",
            }}
          />
        }
      >
        {buttons}
        {disconectButton}
      </PopupMenu>
    : <>
        <FlexRow className="flex-row ai-center c--fit  show-on-trigger-hover">
          {buttons}
        </FlexRow>
        {disconectButton}
      </>;

  return (
    <FlexRow className="ActionsContainer gap-p5 p-p25 ai-start">
      {buttonBar}
    </FlexRow>
  );
};
