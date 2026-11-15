import Btn from "@components/Btn";
import { IconPalette } from "@components/IconPalette/IconPalette";
import PopupMenu from "@components/PopupMenu";
import { mdiCog } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React from "react";
import type { Workspace } from "../Dashboard/dashboardUtils";
import { SmartForm } from "../SmartForm/SmartForm";

type WorkspaceSettingsProps = {
  w: Workspace;
};
export const WorkspaceSettings = ({ w }: WorkspaceSettingsProps) => {
  const { dbs, dbsTables, dbsMethodSchema, dbsSql } = usePrgl();
  return (
    <PopupMenu
      className="w-full"
      title={"Workspace settings"}
      style={{
        height: "100%",
      }}
      clickCatchStyle={{ opacity: 1 }}
      onClickClose={false}
      positioning="top-center"
      data-command="WorkspaceSettings"
      button={
        <Btn
          title="Workspace settings"
          titleAsLabel={true}
          iconPath={mdiCog}
          className="workspace-settings w-full jc-start"
          size="small"
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
            void navigator.clipboard.writeText(
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
            db={dbs}
            sql={dbsSql}
            showJoinedTables={false}
            label=""
            contentClassname="p-1"
            tableName="workspaces"
            tables={dbsTables}
            methods={dbsMethodSchema}
            confirmUpdates={true}
            columns={{
              name: 1,
              published: 1,
              layout_mode: 1,
              icon: {
                onRender: (value: string, onChange) => {
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
