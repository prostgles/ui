import { mdiFilePlusOutline, mdiPlus, mdiSearchWeb } from "@mdi/js";
import type {
  AnyObject,
  TableInfo,
  ValidatedColumnInfo,
} from "prostgles-types";
import { CONTENT_TYPE_TO_EXT, getKeys } from "prostgles-types";
import React, { useState } from "react";
import Btn from "../../../components/Btn";
import SmartTable from "../../SmartTable";
import type { SmartFormProps } from "../SmartForm";
import SmartForm from "../SmartForm";
import { columnIsReadOnly } from "./SmartFormField";

type P = Pick<
  SmartFormProps,
  | "db"
  | "tables"
  | "methods"
  | "hideNullBtn"
  | "enableInsert"
  | "onSuccess"
  | "tableName"
  | "theme"
  | "jsonbSchemaWithControls"
> & {
  column: ValidatedColumnInfo;
  row: AnyObject;
  referencedInsertData?: AnyObject;
  tableInfo: TableInfo;
  action: "update" | "insert" | "view";
  /**
   * Used only when the action is "insert"
   */
  setReferencedInsertData: (
    column: Pick<ValidatedColumnInfo, "is_pkey" | "name">,
    newVal: any,
  ) => void;
  setData: (
    column: Pick<ValidatedColumnInfo, "is_pkey" | "name" | "tsDataType">,
    newVal: any,
  ) => Promise<void>;
};

export const SmartFormFieldOptions = ({
  setData,
  action,
  enableInsert,
  column: c,
  db,
  tableName,
  tables,
  methods,
  row,
  onSuccess,
  theme,
  jsonbSchemaWithControls,
  hideNullBtn,
  referencedInsertData,
  setReferencedInsertData,
}: P) => {
  const readOnly = columnIsReadOnly(action, c);

  const [showNestedInsertForm, setShowNestedInsertForm] = useState<string>();

  const [searchReferencedRow, setSearchReferencedRow] = useState(false);

  const ref = c.references?.sort((a, b) => a.cols.length - b.cols.length)[0];
  const fileTableName = tables[0]?.info.fileTableName;
  const ftable =
    ref?.ftable ?? (c.file && fileTableName ? fileTableName : undefined);
  const fTableCols =
    ftable ? tables.find((t) => t.name === ftable)?.columns : undefined;
  const ftableHandler = ftable && c.references?.length ? db[ftable] : undefined;
  const fcol = ref?.fcols[ref.cols.indexOf(c.name)];
  const canInsertFTableName =
    enableInsert && ftableHandler?.insert ? ftable : undefined;

  let insertBtn: React.ReactNode = null;

  if (canInsertFTableName) {
    if (c.file && ["insert"].includes(action)) {
      const inputProps: React.InputHTMLAttributes<HTMLInputElement> = {};
      if (
        "acceptedContent" in c.file &&
        Array.isArray(c.file.acceptedContent) &&
        c.file.acceptedContent.length
      ) {
        inputProps.accept =
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
        inputProps.accept = c.file.acceptedContentType
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
        inputProps.accept = `${c.file.acceptedFileTypes.map((type) => `.${type}`).join(",")}`;
      }

      insertBtn = (
        <div className="w-fit h-fit">
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
            {...inputProps}
            type="file"
            className="m-0 p-0 hidden"
            autoCorrect="off"
            autoCapitalize="off"
            style={{ width: 0, height: 0, opacity: 0 }}
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              setReferencedInsertData(
                c,
                file ? { name: file.name, data: file } : undefined,
              );
            }}
          />
        </div>
      );
    } else {
      insertBtn = (
        <Btn
          iconPath={mdiPlus}
          onClick={() => {
            setShowNestedInsertForm(canInsertFTableName);
          }}
        />
      );
    }
  }

  let searchBtn: React.ReactNode = null;
  if (action !== "view" && ftableHandler?.find && fTableCols) {
    /** No point showing full table search when there is only 1 column */
    const hasMultipleCols = fTableCols.length > 1;
    searchBtn =
      !hasMultipleCols ? null : (
        <Btn
          iconPath={mdiSearchWeb}
          title="Find record"
          onClick={() => setSearchReferencedRow(true)}
        />
      );
  }

  let rightContent: React.ReactNode = null;
  if (insertBtn || searchBtn) {
    rightContent = (
      <div className="flex-row">
        {searchBtn}
        {insertBtn}
      </div>
    );
  }

  let searchTablePopup: React.ReactNode = null;
  const fcolr = c.references?.[0]?.fcols[0];
  if (searchReferencedRow && fcolr) {
    const tableName = ftable!;

    searchTablePopup = (
      <SmartTable
        theme={theme}
        allowEdit={true}
        title={`Find ${tableName} record`}
        db={db}
        methods={methods}
        tables={tables}
        tableName={tableName}
        onClickRow={(row) => {
          if (!row) return;

          if (readOnly) {
            alert("Cannot change value. This field is read only");
          } else {
            setData(c, row[fcolr]);
          }
          setSearchReferencedRow(false);
        }}
        onClosePopup={() => {
          setSearchReferencedRow(false);
        }}
      />
    );
  }

  return (
    <>
      {searchTablePopup}
      {rightContent}
      {showNestedInsertForm && (
        <SmartForm
          key="referenced-insert"
          asPopup={true}
          db={db}
          theme={theme}
          tables={tables}
          methods={methods}
          hideNullBtn={hideNullBtn}
          tableName={showNestedInsertForm}
          hideChangesOptions={true}
          onClose={() => {
            setShowNestedInsertForm(undefined);
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
              setData(c, newRow[fcol!]);
            }
            onSuccess?.("insert", newRow);
          }}
          onSuccess={onSuccess}
          {...(action === "insert" ?
            {
              defaultData: referencedInsertData?.data,
              onBeforeInsert: (newRowOrRows) => {
                const newRow =
                  Array.isArray(newRowOrRows) ? newRowOrRows[0] : newRowOrRows;
                setReferencedInsertData(c, newRow);
                setShowNestedInsertForm(undefined);
              },
            }
          : {})}
        />
      )}
    </>
  );
};

// throw "Must fix referenced image column nested chain. Ensure it doesn't need a press on Update on parent row"
