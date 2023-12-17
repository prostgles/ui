import { mdiDelete } from "@mdi/js";
import React, { useState } from "react";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import PopupMenu from "../../components/PopupMenu"; 
import { useEffectAsync } from "../DashboardMenu/DashboardMenuSettings";
import { Workspace } from "../Dashboard/dashboardUtils";
import { Prgl } from "../../App";

type WorkspaceDeleteBtnProps = Pick<Prgl, "dbs"> & {
  w: Workspace;
  activeWorkspaceId: string;
}
export const WorkspaceDeleteBtn = ({ dbs, w, activeWorkspaceId }: WorkspaceDeleteBtnProps) => {

  const [error, setError] = useState<any>();
  const [disabledDelete, setDisabledD] = useState("");

  useEffectAsync(async () => {
    const cols = await dbs.workspaces.getColumns!({ rule: "update", data: { id: 'f6c03e9b-d66c-432b-b82c-e959bcbabf16' }} as any);
    setDisabledD(cols.some(c => c.delete)? "" : "Not allowed to delete this workspace")
  }, [])

  return <PopupMenu
    style={{
      height: "100%",
    }}
    onClickClose={false}
    contentStyle={{ maxWidth: "300px" }}
    clickCatchStyle={{ opacity: .2 }}
    positioning="beneath-center"
    button={(
      <Btn
        title="Delete this workspace"
        iconPath={mdiDelete}
        className="delete-workspace"
        disabledInfo={disabledDelete}
        data-command="WorkspaceDeleteBtn"
        color='danger'
      />
    )}
    content={(<div className="flex-col gap-p5">
      <div>Are you sure you want to delete this workspace and all related data (windows, links)?</div>
        {error && <ErrorComponent error={error} />}
      </div>
    )}
    footerButtons={[ 
      {
        label: "Cancel",
        onClickClose: true
      },
      {
        color: "danger",
        label: "Delete workspace",
        variant: "faded",
        "data-command": "WorkspaceDeleteBtn.Confirm",
        onClick: async (e) => {
          e.preventDefault();
          e.stopPropagation();
          try {

            await dbs.workspaces.update({ id: w.id }, { deleted: true });
            if(w.id === activeWorkspaceId){

              const path = ["/connections", w.connection_id].filter(v => v).join("/");
              window.location.href = path;
              
            } else {
              window.location.reload();
            }
          } catch (newWspErr) {
            setError(error)
          }
        }
      },
    ]}
  />
}