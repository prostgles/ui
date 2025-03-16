import {
  isObject,
  type AnyObject,
  type ValidatedColumnInfo,
} from "prostgles-types";
import React from "react";
import { classOverride, FlexCol } from "../../components/Flex";
import { Label } from "../../components/Label";
import type { DBSchemaTablesWJoins } from "../Dashboard/dashboardUtils";
import type { ColumnData, SmartFormProps, SmartFormState } from "./SmartForm";
import {
  SmartFormField,
  type SmartColumnInfo,
} from "./SmartFormField/SmartFormField";
import { SmartFormFileSection } from "./SmartFormFileSection";

type P = Pick<
  SmartFormProps,
  | "tableName"
  | "tables"
  | "db"
  | "label"
  | "contentClassname"
  | "asPopup"
  | "enableInsert"
  | "jsonbSchemaWithControls"
  | "hideNullBtn"
  | "methods"
> &
  Pick<SmartFormState, "error" | "errors"> & {
    newRowData: Record<string, ColumnData> | undefined;
    setNewRowData: (newRowData: Record<string, ColumnData>) => void;
    row: AnyObject;
    table: DBSchemaTablesWJoins[number];
    action: SmartFormState["action"];
    displayedColumns: SmartColumnInfo[];
    setColumnData: (
      column: Pick<ValidatedColumnInfo, "name" | "is_pkey" | "tsDataType">,
      newVal: ColumnData,
    ) => void;
  };
export const SmartFormFieldList = (props: P) => {
  const {
    tableName,
    jsonbSchemaWithControls,
    enableInsert = true,
    db,
    tables,
    contentClassname,
    newRowData,
    table,
    row,
    action,
    displayedColumns,
    error,
    errors,
    setColumnData,
    setNewRowData,
    methods,
  } = props;

  const hideNullBtn = action.type === "view" || props.hideNullBtn;

  const tableInfo = table.info;

  let fileManagerTop: React.ReactNode = null;
  if (tableInfo.isFileTable && tableInfo.fileTableName) {
    fileManagerTop = (
      <SmartFormFileSection
        {...props}
        table={table}
        setNewRow={(newRowData) => setNewRowData(newRowData)}
        row={row}
        action={action}
        setData={(col, files) =>
          setColumnData(col, { type: "column", value: files })
        }
        mediaTableName={tableInfo.fileTableName}
      />
    );
  }

  return (
    <div
      className={classOverride(
        "SmartFormFieldList flex-col f-1 o-auto min-h-0 min-w-0 pb-1 gap-1 px-2",
        contentClassname,
      )}
    >
      {fileManagerTop}
      {displayedColumns.map((c, i) => {
        const rawValue = row[c.name];
        const newValue = newRowData?.[c.name];
        const formFieldStyle: React.CSSProperties =
          !c.sectionHeader ? {} : { marginTop: "1em" };

        if (c.onRender) {
          const columnNode = c.onRender(rawValue, (newVal) =>
            setColumnData(c, newVal),
          );
          return (
            <FlexCol key={c.name} style={formFieldStyle} className="gap-p25">
              <Label variant="normal">{c.label}</Label>
              {columnNode}
            </FlexCol>
          );
        }

        return (
          <SmartFormField
            key={i}
            tableInfo={tableInfo}
            tables={tables}
            db={db}
            tableName={tableName}
            table={table}
            action={action.type}
            column={c}
            value={rawValue}
            newValue={newValue}
            row={row}
            jsonbSchemaWithControls={jsonbSchemaWithControls}
            onChange={(newVal) => setColumnData(c, newVal)}
            error={
              errors?.[c.name] ??
              (isObject(error) && error.column === c.name ? error : undefined)
            }
            rightContentAlwaysShow={false}
            methods={methods}
            hideNullBtn={hideNullBtn}
            sectionHeader={c.sectionHeader}
            style={formFieldStyle}
            enableInsert={enableInsert}
          />
        );
      })}
    </div>
  );
};
