import type { DBSSchema } from "@common/publishUtils";
import type { BtnProps } from "@components/Btn";
import Btn from "@components/Btn";
import FormField from "@components/FormField/FormField";
import PopupMenu from "@components/PopupMenu";
import { mdiPlus } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { useIsMounted } from "prostgles-client";
import { isObject } from "prostgles-types";
import React, { useCallback, useState } from "react";
import type { WorkspaceSchema } from "../Dashboard/dashboardUtils";

type WorkspaceDeleteBtnProps = {
  setWorkspace: (w: Required<WorkspaceSchema>) => void;
  btnProps?: BtnProps<void>;
  className?: string;
};
export const WorkspaceAddBtn = ({
  setWorkspace,
  btnProps,
  className,
}: WorkspaceDeleteBtnProps) => {
  const [error, setError] = useState<unknown>();
  const [name, setName] = useState("");
  const { dbs, connectionId } = usePrgl();

  const getIsMounted = useIsMounted();
  const insertNewWorkspace = useCallback(
    async (closePopup: VoidFunction) => {
      try {
        const newWsp = await dbs.workspaces.insert(
          {
            name,
            connection_id: connectionId,
          } as DBSSchema["workspaces"],
          { returning: "*" },
        );
        if (!getIsMounted()) return;
        setWorkspace(newWsp);
        closePopup();
      } catch (newWspErr: any) {
        if (
          isObject(newWspErr) &&
          newWspErr.columns?.join?.() ===
            ["user_id", "connection_id", "name"].join()
        ) {
          setError("Already exists");
        } else {
          setError(newWspErr);
        }
      }
    },
    [dbs, name, connectionId, setError, setWorkspace, getIsMounted],
  );

  return (
    <PopupMenu
      style={{}}
      onClickClose={false}
      className={className}
      autoFocusFirst={"content"}
      positioning="inside"
      data-command="WorkspaceAddBtn"
      button={
        <Btn
          title="Add new workspace"
          iconPath={mdiPlus}
          size="small"
          variant="filled"
          color="action"
          {...btnProps}
        />
      }
      render={(closePopup) => (
        <div
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void insertNewWorkspace(closePopup);
            }
          }}
        >
          <FormField
            label="New workspace name"
            value={name}
            onChange={(name) => {
              setName(name);
              setError(undefined);
            }}
            error={error}
          />
        </div>
      )}
      footerButtons={(closePopup) => [
        {
          label: "Cancel",
          onClickClose: true,
        },
        {
          color: "action",
          label: "Create",
          variant: "filled",
          iconPath: mdiPlus,
          "data-command": "WorkspaceAddBtn.Create",
          onClickPromise: (event) =>
            insertNewWorkspace(() => closePopup?.(event)),
        },
      ]}
    />
  );
};
