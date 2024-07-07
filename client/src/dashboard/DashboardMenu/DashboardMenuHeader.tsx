import { mdiPinOffOutline, mdiPinOutline, mdiScriptTextPlay, mdiSearchWeb } from "@mdi/js";
import React from "react";
import { dataCommand } from "../../Testing";
import Btn from "../../components/Btn";
import { FlexRowWrap } from "../../components/Flex";
import type { DashboardMenuProps } from "./DashboardMenu";
import { DashboardMenuSettings } from "./DashboardMenuSettings";
import { getIsPinnedMenu } from "../Dashboard/Dashboard";

type P = Pick<DashboardMenuProps, "prgl" | "loadTable" | "workspace"> & {
  onClose: VoidFunction | undefined;
  onClickSearchAll: VoidFunction
}

export const DashboardMenuHeader = ({ prgl, loadTable, onClose, workspace, onClickSearchAll }: P) => {
  const db = prgl.db;
  const pinnedMenu = getIsPinnedMenu(workspace)
  return <FlexRowWrap className="DashboardMenuHeader gap-p5 f-0" > 
    <Btn key="sql" 
      { ...dataCommand("dashboard.menu.sqlEditor") }
      className="f-1 jc-start max-w-fit"
      title="SQL Query"
      onClick={e => {
        loadTable({ type: "sql", name: "SQL Query" });
        onClose?.();
      }} 
      color="action"
      variant="filled"
      iconPath={mdiScriptTextPlay}
      disabledInfo={db.sql? undefined : "Not permitted"}
    >
      {window.isLowWidthScreen? null : "SQL Editor"}
    </Btn> 
    <Btn iconPath={mdiSearchWeb}
      title="Show quick search menu (CTRL + P)"
      className="ml-auto"
      onClick={() => {
        onClickSearchAll();
        onClose?.()
      }}
    />
    <DashboardMenuSettings 
      prgl={prgl} 
      workspace={workspace}
    />
    <Btn iconPath={!pinnedMenu? mdiPinOutline : mdiPinOffOutline}
      disabledInfo={window.isLowWidthScreen? "Cannot be used in a low width device" : undefined}
      title="Pin/Unpin"
      className="ml-p25"
      onClick={() => {
        workspace.$update({ options: { pinnedMenu: !workspace.options.pinnedMenu } }, { deepMerge: true })
        onClose?.()
      }}
    />
  </FlexRowWrap>
}