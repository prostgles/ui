import { mdiFilePlusOutline, mdiPlus } from "@mdi/js";
import { CONTENT_TYPE_TO_EXT, getKeys } from "prostgles-types";
import React, { useMemo } from "react";
import Btn from "../../../components/Btn";
import SmartForm from "../SmartForm";
import type {
  SmartFormFieldLinkedDataInsertState,
  SmartFormFieldLinkedDataProps,
} from "./SmartFormFieldLinkedData";

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
  | "setData"
  | "onSuccess"
> &
  SmartFormFieldLinkedDataInsertState & {
    ftable: string;
    fcol: string;
  };

export const SmartFormFieldLinkedDataInsert = ({
  db,
  ftable: canInsertFTableName,
  fcol,
  column: c,
  action,
  tables,
  methods,
  tableName,
  row,
  hideNullBtn,
  jsonbSchemaWithControls,
  setData,
  onSuccess,
  setShowNestedInsertForm,
  showNestedInsertForm,
  newValue,
}: P) => {
  const fileInsert = useMemo(() => {
    if (!(c.file && ["insert"].includes(action))) {
      return;
    }

    let inputAccept: string | undefined;
    if (
      "acceptedContent" in c.file &&
      Array.isArray(c.file.acceptedContent) &&
      c.file.acceptedContent.length
    ) {
      inputAccept =
        c.file.acceptedContent.map((c) => `${c}/*`).join() +
        "," +
        c.file.acceptedContent
          .flatMap((type) =>
            getKeys(CONTENT_TYPE_TO_EXT)
              .filter((k) => k.startsWith(type))
              .flatMap((k) => CONTENT_TYPE_TO_EXT[k])
              .flat(),
          )
          .map((type) => `.${type}`)
          .join(",");
    } else if (
      "acceptedContentType" in c.file &&
      Array.isArray(c.file.acceptedContentType) &&
      c.file.acceptedContentType.length
    ) {
      inputAccept = c.file.acceptedContentType
        .flatMap((type) =>
          getKeys(CONTENT_TYPE_TO_EXT)
            .filter((k) => k === type)
            .flatMap((k) => CONTENT_TYPE_TO_EXT[k])
            .flat(),
        )
        .map((type) => `.${type}`)
        .join(",");
    } else if (
      "acceptedFileTypes" in c.file &&
      Array.isArray(c.file.acceptedFileTypes) &&
      c.file.acceptedFileTypes.length
    ) {
      inputAccept = `${c.file.acceptedFileTypes.map((type) => `.${type}`).join(",")}`;
    }

    const onInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
      const file = e.currentTarget.files?.[0];
      setData({ type: "nested-column", value: file });
    };

    return { inputAccept, onInputChange };
  }, [action, c, setData]);

  const referencedInsertData =
    newValue?.type === "nested-column" ? newValue.value : undefined;
  return (
    <>
      {!fileInsert ?
        <Btn
          data-command="SmartFormFieldOptions.NestedInsert"
          data-key={canInsertFTableName}
          iconPath={mdiPlus}
          onClick={() => {
            setShowNestedInsertForm(true);
          }}
        />
      : <div className="w-fit h-fit">
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
            accept={fileInsert.inputAccept}
            type="file"
            className="m-0 p-0 hidden"
            autoCorrect="off"
            autoCapitalize="off"
            style={{ width: 0, height: 0, opacity: 0 }}
            onChange={fileInsert.onInputChange}
          />
        </div>
      }
      {showNestedInsertForm && (
        <SmartForm
          key="referenced-insert"
          asPopup={true}
          db={db}
          tables={tables}
          methods={methods}
          hideNullBtn={hideNullBtn}
          tableName={canInsertFTableName}
          hideChangesOptions={true}
          onClose={() => {
            setShowNestedInsertForm(false);
          }}
          jsonbSchemaWithControls={jsonbSchemaWithControls}
          isReferencedInsert={{
            tableName,
            columnName: c.name,
            pkeyColumns:
              tables
                .find((t) => t.name === tableName)
                ?.columns.filter((c) => c.is_pkey)
                .map((c) => c.name) ?? [],
            row,
          }}
          onInserted={(newRowOrRows) => {
            const newRow =
              Array.isArray(newRowOrRows) ? newRowOrRows[0] : newRowOrRows;
            if (newRow) {
              setData({ type: "column", value: newRow[fcol!] });
            }
            onSuccess?.("insert", newRow);
          }}
          onSuccess={onSuccess}
          {...(action === "insert" ?
            {
              defaultData: referencedInsertData,
              onBeforeInsert: (newRowOrRows) => {
                const newRow =
                  Array.isArray(newRowOrRows) ? newRowOrRows[0] : newRowOrRows;
                setData({ type: "nested-column", value: newRow });
              },
            }
          : {})}
        />
      )}
    </>
  );
};
