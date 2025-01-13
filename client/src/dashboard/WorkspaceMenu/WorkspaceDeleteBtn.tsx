import { mdiDelete } from "@mdi/js";
import React, { useState } from "react";
import type { Prgl } from "../../App";
import Btn, { type BtnProps } from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import { pageReload } from "../../components/Loading";
import PopupMenu from "../../components/PopupMenu";
import type { Workspace } from "../Dashboard/dashboardUtils";
import { API_PATH_SUFFIXES } from "../../../../commonTypes/utils";

type WorkspaceDeleteBtnProps = Pick<Prgl, "dbs"> &
  Pick<BtnProps, "disabledInfo"> & {
    w: Workspace;
    activeWorkspaceId: string;
  };
export const WorkspaceDeleteBtn = ({
  dbs,
  w,
  activeWorkspaceId,
  disabledInfo,
}: WorkspaceDeleteBtnProps) => {
  const [error, setError] = useState<any>();

  return (
    <PopupMenu
      style={{
        height: "100%",
      }}
      onClickClose={false}
      contentStyle={{ maxWidth: "300px" }}
      clickCatchStyle={{ opacity: 0.2 }}
      positioning="beneath-center"
      button={
        <Btn
          title="Delete this workspace"
          iconPath={mdiDelete}
          className="delete-workspace"
          disabledInfo={disabledInfo}
          data-command="WorkspaceDeleteBtn"
          color="danger"
        />
      }
      content={
        <div className="flex-col gap-p5">
          <div>
            Are you sure you want to delete this workspace and all related data
            (windows, links)?
          </div>
          {error && <ErrorComponent error={error} />}
        </div>
      }
      footerButtons={[
        {
          label: "Cancel",
          onClickClose: true,
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
              if (w.id === activeWorkspaceId) {
                const path = [API_PATH_SUFFIXES.DASHBOARD, w.connection_id]
                  .filter((v) => v)
                  .join("/");
                window.location.href = path;
              } else {
                pageReload("Workspace deleted");
              }
            } catch (newWspErr) {
              setError(error);
            }
          },
        },
      ]}
    />
  );
};
