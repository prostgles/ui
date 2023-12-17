import { mdiPinOffOutline, mdiPinOutline, mdiScriptTextPlay, mdiSearchWeb } from '@mdi/js';
import React from 'react';
import { dataCommand } from '../../Testing';
import Btn from "../../components/Btn";
import { FlexRow } from '../../components/Flex';
import { DashboardMenuProps } from './DashboardMenu';
import { DashboardMenuSettings } from "./DashboardMenuSettings";
type P = Pick<DashboardMenuProps, "prgl" | "loadTable" | "workspace"> & {
  onClose: VoidFunction;
  pinnedMenu: boolean | undefined;
  onClickSearchAll: VoidFunction
}
export const DashboardMenuHeader = ({ prgl, loadTable, onClose, workspace, pinnedMenu, onClickSearchAll }: P) => {
  const db = prgl.db;
  return <FlexRow className="DashboardMenuHeader gap-0 f-0" > 
    <Btn key="sql" 
      { ...dataCommand("dashboard.menu.sqlEditor") }
      title="SQL Query"
      onClick={e => {
        loadTable({ type: "sql", name: "SQL Query" });
        onClose();
      }} 
      color="action"
      variant="filled"
      iconPath={mdiScriptTextPlay}
      disabledInfo={db.sql? undefined : "Not permitted"}
    >
      {pinnedMenu? null : "SQL Editor"}
    </Btn> 
    <Btn iconPath={mdiSearchWeb}
      title="Show quick search menu (CTRL + P)"
      className="ml-auto"
      onClick={() => {
        onClickSearchAll();
        onClose()
      }}
    />
    <DashboardMenuSettings 
      prgl={prgl} 
      workspace={workspace}
    />
    <Btn iconPath={!workspace.options.pinnedMenu? mdiPinOutline : mdiPinOffOutline}
      disabledInfo={window.isLowWidthScreen? "Cannot be used in a low width device" : undefined}
      title="Pin/Unpin"
      className="ml-p25"
      onClick={() => {
        workspace.$update({ options: { pinnedMenu: !workspace.options.pinnedMenu } }, { deepMerge: true })
        onClose()
      }}
    />
  </FlexRow>
}