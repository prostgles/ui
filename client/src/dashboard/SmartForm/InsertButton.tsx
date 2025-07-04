import { mdiPlus } from "@mdi/js";
import React, { useCallback, useState } from "react";
import type { BtnProps } from "../../components/Btn";
import Btn from "../../components/Btn";
import { FileInput } from "../../components/FileInput/FileInput";
import { t } from "../../i18n/i18nUtils";
import type { SmartFormProps } from "./SmartForm";
import { SmartForm } from "./SmartForm";

export type InsertButtonProps = {
  buttonProps?: BtnProps<void>;
} & Pick<
  SmartFormProps,
  | "db"
  | "tables"
  | "methods"
  | "tableName"
  | "onSuccess"
  | "defaultData"
  | "fixedData"
>;

export const InsertButton = ({
  buttonProps,
  tables,
  db,
  methods,
  tableName,
  onSuccess,
  defaultData,
  fixedData,
}: InsertButtonProps) => {
  const [open, setOpen] = useState(false);
  const onClose = useCallback(() => {
    setOpen(false);
  }, []);
  const [defaultFileData, setDefaultFileData] = useState(defaultData);
  if (!db[tableName]?.insert) {
    return null;
  }

  const table = tables.find((t) => t.name === tableName);
  if (table?.info.isFileTable && !defaultFileData) {
    return (
      <FileInput
        maxFileCount={1}
        showDropZone={false}
        onAdd={(files) => {
          if (!files.length) return;

          setDefaultFileData(files[0]);
          setOpen(true);
        }}
      />
    );
  }

  return (
    <>
      <Btn
        iconPath={mdiPlus}
        {...buttonProps}
        title={t.W_Table["Insert row"]}
        data-command="dashboard.window.rowInsertTop"
        data-key={tableName}
        color="action"
        variant="filled"
        onClick={() => setOpen(!open)}
      />
      {open && (
        <SmartForm
          asPopup={true}
          confirmUpdates={true}
          defaultData={defaultData}
          fixedData={fixedData}
          db={db}
          tables={tables}
          methods={methods}
          tableName={tableName}
          onSuccess={onSuccess}
          onClose={onClose}
        />
      )}
    </>
  );
};
