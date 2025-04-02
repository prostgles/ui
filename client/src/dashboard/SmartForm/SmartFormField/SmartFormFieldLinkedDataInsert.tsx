import { mdiFilePlusOutline, mdiPlus } from "@mdi/js";
import { CONTENT_TYPE_TO_EXT, getKeys } from "prostgles-types";
import React, { useMemo } from "react";
import Btn from "../../../components/Btn";
import { SmartForm } from "../SmartForm";
import type {
  SmartFormFieldLinkedDataInsertState,
  SmartFormFieldLinkedDataProps,
} from "./SmartFormFieldLinkedData";
import { NewRowDataHandler } from "../SmartFormNewRowDataHandler";
import { useNestedInsertDefaultData } from "./useNestedInsertDefaultData";

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
  const columnFile = column.file;
  const fileInsert = useMemo(() => {
    if (!(columnFile && ["insert"].includes(action))) {
      return;
    }

    let inputAccept: string | undefined;
    if (
      "acceptedContent" in columnFile &&
      Array.isArray(columnFile.acceptedContent) &&
      columnFile.acceptedContent.length
    ) {
      inputAccept =
        columnFile.acceptedContent.map((c) => `${c}/*`).join() +
        "," +
        columnFile.acceptedContent
          .flatMap((type) =>
            getKeys(CONTENT_TYPE_TO_EXT)
              .filter((k) => k.startsWith(type))
              .flatMap((k) => CONTENT_TYPE_TO_EXT[k])
              .flat(),
          )
          .map((type) => `.${type}`)
          .join(",");
    } else if (
      "acceptedContentType" in columnFile &&
      Array.isArray(columnFile.acceptedContentType) &&
      columnFile.acceptedContentType.length
    ) {
      inputAccept = columnFile.acceptedContentType
        .flatMap((type) =>
          getKeys(CONTENT_TYPE_TO_EXT)
            .filter((k) => k === type)
            .flatMap((k) => CONTENT_TYPE_TO_EXT[k])
            .flat(),
        )
        .map((type) => `.${type}`)
        .join(",");
    } else if (
      "acceptedFileTypes" in columnFile &&
      Array.isArray(columnFile.acceptedFileTypes) &&
      columnFile.acceptedFileTypes.length
    ) {
      inputAccept = `${columnFile.acceptedFileTypes.map((type) => `.${type}`).join(",")}`;
    }

    const onInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
      const file = e.currentTarget.files?.[0];
      newRowDataHandler.setNestedColumn(
        column.name,
        file && {
          name: file.name,
          data: file,
        },
      );
    };

    return { inputAccept, onInputChange };
  }, [action, columnFile, newRowDataHandler, column.name]);

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
