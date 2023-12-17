import { mdiPlus } from "@mdi/js"
import { AnyObject } from "prostgles-types";
import React, { useState } from "react"
import Btn, { BtnProps } from "../../components/Btn"
import FileInput from "../../components/FileInput/FileInput"; 
import SmartForm, { SmartFormProps } from "./SmartForm";


type InsertButtonProps = {
  buttonProps?: BtnProps<void>;
} & Pick<SmartFormProps, "db" | "tables" | "methods" | "tableName" | "onSuccess" | "theme">;

export const InsertButton = ({ buttonProps, tables, db, methods, tableName, onSuccess, theme }: InsertButtonProps) => {
  const [open, setOpen] = useState(false);
  const [defaultData, setDefaultData] = useState<AnyObject>();
  if(!db[tableName]?.insert){
    return null;
  }

  const table = tables.find(t => t.name === tableName);
  if(table?.info.isFileTable && !defaultData){
    return <FileInput 
      maxFileCount={1}
      onAdd={files => {
        if(!files.length) return;

        setDefaultData(files[0]);
        setOpen(true)
        // const currMedia = [
        //   ...(newRow?.[mTblName] || []),
        //   ...(action.currentRow?.[mTblName] || [])
        // ].filter(isDefined)
        // this.setData({
        //   name: mTblName,
        //   is_pkey: false,
        //   tsDataType: "any[]"
        // }, [...currMedia, ...files]);
      }}
    />
  }

  return <>
      <Btn iconPath={mdiPlus}
        {...buttonProps}
        title="Insert row"
        data-command="dashboard.window.rowInsertTop"
        data-key={tableName}
        color="action"
        variant="filled"
        onClick={() => setOpen(!open)}
      />
      {open &&  <SmartForm
        theme={theme}
        asPopup={true}
        confirmUpdates={true}
        hideChangesOptions={true}
        defaultData={defaultData}
        db={db}
        tables={tables}
        methods={methods}
        tableName={tableName}
        onSuccess={onSuccess}
        onClose={() => setOpen(false)}
      />}
  </>
}