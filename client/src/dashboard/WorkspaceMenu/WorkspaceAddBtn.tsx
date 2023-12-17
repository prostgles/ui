import { mdiPlus } from "@mdi/js";
import React, { useCallback, useState } from "react";
import Btn, { BtnProps } from "../../components/Btn";
import FormField from "../../components/FormField/FormField";
import { isObject } from "prostgles-types"
import PopupMenu from "../../components/PopupMenu";
import { WorkspaceSchema } from "../Dashboard/dashboardUtils";
import { Prgl } from "../../App";
import { DBSSchema } from "../../../../commonTypes/publishUtils";

type WorkspaceDeleteBtnProps = Pick<Prgl, "dbs"> & {
  connection_id: string;
  setWorkspace(w?: Required<WorkspaceSchema> | undefined): void;
  closePopup: ()=>void;
  btnProps?: BtnProps<void>;
  className?: string;
}
export const WorkspaceAddBtn = ({ dbs, connection_id, setWorkspace, closePopup, btnProps, className }: WorkspaceDeleteBtnProps) => {

  const [error, setError] = useState<any | void>();
  const [name, setName] = useState("");

  const insertNewWorkspace = useCallback(async () => {
    try {
      const newWsp = await dbs.workspaces.insert(
        { name, connection_id } as DBSSchema["workspaces"], 
        { returning: "*" }
      );
      
      setWorkspace(newWsp);
      closePopup();
    } catch (newWspErr: any) {
      if(isObject(newWspErr) && newWspErr.columns?.join?.() === [
        "user_id",
        "connection_id",
        "name"
      ].join()){
        setError("Already exists");
      } else {
        setError(newWspErr)
      }
    }
  }, [dbs, name, connection_id, setError, setWorkspace, closePopup])

  return <PopupMenu
    style={{
    }}
    onClickClose={false}
    className={className} 
    onKeyDown={e => {
      if(e.key === "Enter"){
        insertNewWorkspace();
      }
    }}
    autoFocusFirst={"content"}
    positioning="inside"
    button={(
      <Btn
        title="Add new workspace"
        iconPath={mdiPlus}
        size="small"
        variant="filled"
        color='action'
        {...btnProps}
      />
    )}
    content={(
      <div>
        <FormField label="New workspace name" 
          asColumn={true}
          value={name} 
          onChange={name => {
            setName(name);
            setError(undefined);
          }} 
          error={error} 
        />
      </div>
    )}
    footerButtons={[
      {
        label: "Cancel",
        onClickClose: true
      },
      {
        color: "action",
        label: "Create",
        variant: "filled",
        iconPath: mdiPlus,
        onClickPromise: insertNewWorkspace
      }
    ]}
  />
}