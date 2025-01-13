import {
  mdiChartLine,
  mdiCog,
  mdiDotsHorizontal,
  mdiDotsVertical,
  mdiLadybug,
  mdiPencil,
} from "@mdi/js";
import React from "react";
import Btn from "../../components/Btn";
import { FlexRow } from "../../components/Flex";
import PopupMenu from "../../components/PopupMenu";
import { StatusMonitor } from "../../dashboard/StatusMonitor";
import { StatusDotCircleIcon } from "../Account/Sessions";
import type { ConnectionProps } from "./Connection";

export const ConnectionActionBar = (props: ConnectionProps) => {
  const { dbsMethods, c, dbs, isAdmin } = props;

  const { isMobile } = window;

  const disconectButton = dbsMethods.disconnect && !c.is_state_db && (
    <Btn
      disabledInfo={!c.isConnected ? "Not connected" : undefined}
      disabledVariant="no-fade"
      title="Connected. Click to disconnect"
      color={c.isConnected ? "green" : undefined}
      className={c.isConnected ? "" : "show-on-trigger-hover"}
      onClickPromise={async () => {
        await dbsMethods.disconnect!(c.id);
      }}
      style={{
        // opacity: c.isConnected? undefined : 0,
        padding: "14px",
      }}
    >
      <StatusDotCircleIcon color={c.isConnected ? "green" : "gray"} />
    </Btn>
  );

  const buttons = (
    <>
      <Btn
        title="Close all windows"
        titleAsLabel={isMobile}
        iconPath={mdiLadybug}
        onClickPromise={async () => {
          // const wsp = await dbs.workspaces.findOne({ connection_id: c.id });
          const closed = await dbs.windows.update(
            { $existsJoined: { workspaces: { connection_id: c.id } } },
            { closed: true },
            { returning: "*" },
          );
          if (closed) {
            alert("Windows have been closed");
          } else {
            alert("Could not close windows: workspace not found");
          }
        }}
      />
      {dbsMethods.getStatus && dbsMethods.runConnectionQuery && (
        <PopupMenu
          title={"Activity status: " + (c.name || c.id)}
          positioning="fullscreen"
          onClickClose={false}
          button={
            <Btn
              title="Status"
              titleAsLabel={isMobile}
              color={"action"}
              iconPath={mdiChartLine}
            />
          }
        >
          <StatusMonitor
            {...props}
            connectionId={c.id}
            getStatus={dbsMethods.getStatus}
            runConnectionQuery={dbsMethods.runConnectionQuery}
          />
        </PopupMenu>
      )}

      {isAdmin && !c.is_state_db && (
        <Btn
          href={"/connection-config/" + c.id}
          title="Configure"
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
          href={"/edit-connection/" + c.id}
          title="Edit connection"
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
            size="medium"
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
