import { mdiCog } from "@mdi/js";
import { usePromise } from "prostgles-client/dist/prostgles";
import React from "react";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import PopupMenu from "../../components/PopupMenu";
import Select from "../../components/Select/Select";
import type {
  DBSchemaTablesWJoins,
  Workspace,
} from "../Dashboard/dashboardUtils";
import SmartForm from "../SmartForm/SmartForm";
import { IconPalette } from "../../components/IconPalette/IconPalette";

type WorkspaceSettingsProps = Pick<Prgl, "dbs" | "dbsMethods" | "theme"> & {
  w: Workspace;
  dbsTables: DBSchemaTablesWJoins;
};
export const WorkspaceSettings = ({
  dbs,
  dbsTables,
  w,
  dbsMethods,
  theme,
}: WorkspaceSettingsProps) => {
  return (
    <PopupMenu
      title={"Workspace settings"}
      style={{
        height: "100%",
      }}
      clickCatchStyle={{ opacity: 1 }}
      onClickClose={false}
      button={
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
                  },
                },
              },
            );
            navigator.clipboard.writeText(
              JSON.stringify(workspaceData, null, 2),
            );
            alert("Workspace data copied to clipboard");
          }}
        />
      }
      contentStyle={{ padding: 0 }}
      render={(popupClose) => (
        <div className="flex-col gap-p5  min-h-0">
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
            columns={{
              name: 1,
              published: 1,
              publish_mode: 1,
              icon: {
                onRender: (value, onChange) => {
                  return <IconPalette iconName={value} onChange={onChange} />;
                },
              },
            }}
            disabledActions={["clone", "delete"]}
            rowFilter={[{ fieldName: "id", value: w.id }]}
            onClose={popupClose}
          />
        </div>
      )}
    />
  );
};
