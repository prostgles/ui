import Btn from "@components/Btn";
import { mdiFilePlusOutline, mdiPlus } from "@mdi/js";
import React from "react";
import { SmartForm } from "../../SmartForm";
import { NewRowDataHandler } from "../../SmartFormNewRowDataHandler";
import type {
  SmartFormFieldLinkedDataInsertState,
  SmartFormFieldLinkedDataProps,
} from "../SmartFormFieldLinkedData";
import { useNestedInsertDefaultData } from "../useNestedInsertDefaultData";
import { useSmartFormFieldLinkedDataInsert } from "./useSmartFormFieldLinkedDataInsert";

type P = Pick<
  SmartFormFieldLinkedDataProps,
  | "db"
  | "column"
  | "action"
  | "newValue"
  | "tables"
  | "methods"
  | "tableName"
  | "row"
  | "hideNullBtn"
  | "jsonbSchemaWithControls"
  | "onSuccess"
  | "rowFilter"
> &
  SmartFormFieldLinkedDataInsertState & {
    ftable: string;
    fcol: string;
    newRowDataHandler: NewRowDataHandler;
  };

export const SmartFormFieldLinkedDataInsert = ({
  db,
  ftable: canInsertFTableName,
  fcol,
  column,
  action,
  tables,
  methods,
  tableName,
  row,
  hideNullBtn,
  jsonbSchemaWithControls,
  onSuccess,
  setShowNestedInsertForm,
  showNestedInsertForm,
  newValue,
  rowFilter,
  newRowDataHandler,
}: P) => {
  const { fileUpsertInsert } = useSmartFormFieldLinkedDataInsert({
    column,
    action,
    newRowDataHandler,
  });

  const parentFormNewRowDataHandler =
    (
      newValue?.type === "nested-column" &&
      newValue.value instanceof NewRowDataHandler
    ) ?
      newValue.value
    : undefined;

  const defaultData = useNestedInsertDefaultData({
    ftable: canInsertFTableName,
    tables,
    tableName,
    row,
  });

  if (fileUpsertInsert) {
    return (
      <div className="SmartFormFieldLinkedDataInsert w-fit h-fit">
        <Btn
          iconPath={mdiFilePlusOutline}
          color="action"
          title="Attach file"
          data-command="SmartFormFieldOptions.AttachFile"
          onClick={(e) => {
            const input =
              e.currentTarget.parentElement?.querySelector<HTMLInputElement>(
                "input",
              );
            if (input) {
              input.click();
            }
          }}
        />
        <input
          accept={fileUpsertInsert.inputAccept}
          type="file"
          className="m-0 p-0 hidden"
          autoCorrect="off"
          autoCapitalize="off"
          style={{ width: 0, height: 0, opacity: 0 }}
          onChange={fileUpsertInsert.onInputChange}
        />
      </div>
    );
  }

  return (
    <>
      <Btn
        data-command="SmartFormFieldOptions.NestedInsert"
        title="Insert new record"
        data-key={canInsertFTableName}
        iconPath={mdiPlus}
        onClick={() => {
          setShowNestedInsertForm(true);
        }}
      />
      {showNestedInsertForm && (
        <SmartForm
          key="referenced-insert"
          asPopup={true}
          db={db}
          tables={tables}
          methods={methods}
          hideNullBtn={hideNullBtn}
          tableName={canInsertFTableName}
          onClose={() => {
            setShowNestedInsertForm(false);
          }}
          defaultData={defaultData}
          jsonbSchemaWithControls={jsonbSchemaWithControls}
          onInserted={(newRowOrRows) => {
            const newRow =
              Array.isArray(newRowOrRows) ? newRowOrRows[0] : newRowOrRows;
            if (newRow) {
              newRowDataHandler.setColumnData(column.name, newRow[fcol!]);
            }
          }}
          onSuccess={(r) => {
            onSuccess?.(r);
          }}
          parentForm={{
            table: tables.find((t) => t.name === tableName)!,
            ...(action === "insert" ?
              {
                type: "insert",
                newRowDataHandler: parentFormNewRowDataHandler,
                setColumnData: (newRow) => {
                  newRowDataHandler.setNestedColumn(column.name, newRow);
                  setShowNestedInsertForm(false);
                },
              }
            : {
                type: "insert-and-update",
                column: column,
                rowFilter,
                row,
              }),
          }}
        />
      )}
    </>
  );
};
