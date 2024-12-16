import { mdiPlus } from "@mdi/js";
import React, { useCallback, useState } from "react";
import type { BtnProps } from "../../components/Btn";
import Btn from "../../components/Btn";
import FormField from "../../components/FormField/FormField";
import { isObject } from "prostgles-types";
import PopupMenu from "../../components/PopupMenu";
import type { WorkspaceSchema } from "../Dashboard/dashboardUtils";
import type { Prgl } from "../../App";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import { useIsMounted } from "prostgles-client/dist/react-hooks";

type WorkspaceDeleteBtnProps = Pick<Prgl, "dbs"> & {
  connection_id: string;
  setWorkspace(w: Required<WorkspaceSchema>): void;
  btnProps?: BtnProps<void>;
  className?: string;
};
export const WorkspaceAddBtn = ({
  dbs,
  connection_id,
  setWorkspace,
  btnProps,
  className,
}: WorkspaceDeleteBtnProps) => {
  const [error, setError] = useState<any | void>();
  const [name, setName] = useState("");

  const getIsMounted = useIsMounted();
  const insertNewWorkspace = useCallback(async () => {
    try {
      const newWsp = await dbs.workspaces.insert(
        {
          name,
          connection_id,
        } as DBSSchema["workspaces"],
        { returning: "*" },
      );
      if (!getIsMounted()) return;
      setWorkspace(newWsp);
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
  }, [dbs, name, connection_id, setError, setWorkspace, getIsMounted]);

  return (
    <PopupMenu
      style={{}}
      onClickClose={false}
      className={className}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          insertNewWorkspace();
        }
      }}
      autoFocusFirst={"content"}
      positioning="inside"
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
      content={
        <div>
          <FormField
            label="New workspace name"
            asColumn={true}
            value={name}
            onChange={(name) => {
              setName(name);
              setError(undefined);
            }}
            error={error}
          />
        </div>
      }
      footerButtons={[
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
          onClickPromise: insertNewWorkspace,
        },
      ]}
    />
  );
};
