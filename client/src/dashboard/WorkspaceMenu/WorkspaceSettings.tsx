import { mdiCog } from "@mdi/js";
import React from "react";
import Btn from "../../components/Btn"; 
import PopupMenu from "../../components/PopupMenu"; 
import type { DBSchemaTablesWJoins, Workspace } from "../Dashboard/dashboardUtils";
import SmartForm from "../SmartForm/SmartForm";
import type { Prgl } from "../../App";

type WorkspaceSettingsProps = Pick<Prgl, "dbs" | "dbsMethods" | "theme"> & {
  w: Workspace;
  dbsTables: DBSchemaTablesWJoins;
}
export const WorkspaceSettings = ({ dbs, dbsTables, w, dbsMethods, theme }: WorkspaceSettingsProps) => {

  return <PopupMenu
    title={"Workspace settings"}
    style={{
      height: "100%",
    }}
    onClickClose={false}
    button={(
      <Btn
        title="Workspace settings"
        iconPath={mdiCog}
        className="workspace-settings"
        onContextMenu={async () => {
          const workspaceData = await dbs.workspaces.findOne(
            { id: w.id }, 
            { 
              select: {
                name: true,
                options: true,
                layout: true,
                windows: {
                  id: false,
                  user_id: false,
                  workspace_id: false,
                  created: false,
                  last_updated: false,
                }
              } 
            }
          );
          navigator.clipboard.writeText(JSON.stringify(workspaceData, null, 2));
          alert("Workspace data copied to clipboard");
        }}
      />
    )}
    contentStyle={{ padding: 0 }}
    render={popupClose => (<div className="flex-col gap-p5  min-h-0">
      <SmartForm 
        db={dbs as any}
        showJoinedTables={false}
        theme={theme}
        label=""
        tableName="workspaces" 
        tables={dbsTables}
        methods={dbsMethods}
        hideChangesOptions={true}
        confirmUpdates={true}
        columns={["name", "published"]}
        disabledActions={["clone", "delete"]}
        rowFilter={[
          { fieldName: "id", value: w.id }
        ]}
        onClose={popupClose}
      />
    </div>)}
  />
}