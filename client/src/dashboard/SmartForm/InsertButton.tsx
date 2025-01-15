import { mdiPlus } from "@mdi/js";
import type { AnyObject } from "prostgles-types";
import React, { useState } from "react";
import type { BtnProps } from "../../components/Btn";
import Btn from "../../components/Btn";
import FileInput from "../../components/FileInput/FileInput";
import type { SmartFormProps } from "./SmartForm";
import SmartForm from "./SmartForm";
import { t } from "../../i18n/i18nUtils";

type InsertButtonProps = {
  buttonProps?: BtnProps<void>;
} & Pick<
  SmartFormProps,
  "db" | "tables" | "methods" | "tableName" | "onSuccess" | "theme"
>;

export const InsertButton = ({
  buttonProps,
  tables,
  db,
  methods,
  tableName,
  onSuccess,
  theme,
}: InsertButtonProps) => {
  const [open, setOpen] = useState(false);
  const [defaultData, setDefaultData] = useState<AnyObject>();
  if (!db[tableName]?.insert) {
    return null;
  }

  const table = tables.find((t) => t.name === tableName);
  if (table?.info.isFileTable && !defaultData) {
    return (
      <FileInput
        maxFileCount={1}
        showDropZone={false}
        onAdd={(files) => {
          if (!files.length) return;

          setDefaultData(files[0]);
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
        />
      )}
    </>
  );
};
