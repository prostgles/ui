import {
  isObject,
  type AnyObject,
  type ValidatedColumnInfo,
} from "prostgles-types";
import React from "react";
import { classOverride, FlexCol } from "../../components/Flex";
import { Label } from "../../components/Label";
import type { DBSchemaTablesWJoins } from "../Dashboard/dashboardUtils";
import type { SmartFormProps } from "./SmartForm";
import {
  SmartFormField,
  type SmartColumnInfo,
} from "./SmartFormField/SmartFormField";
import { SmartFormFileSection } from "./SmartFormFileSection";
import type {
  ColumnData,
  NewRow,
  NewRowDataHandler,
} from "./SmartFormNewRowDataHandler";
import type { SmartFormState } from "./useSmartForm";
import type { SmartFormModeState } from "./useSmartFormMode";

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
  SmartFormModeState &
  Pick<SmartFormState, "error" | "errors"> & {
    newRowDataHandler: NewRowDataHandler;
    newRow: NewRow | undefined;
    row: AnyObject;
    table: DBSchemaTablesWJoins[number];
    displayedColumns: SmartColumnInfo[];
  };
export const SmartFormFieldList = (props: P) => {
  const {
    tableName,
    jsonbSchemaWithControls,
    enableInsert = true,
    db,
    tables,
    contentClassname,
    newRowDataHandler,
    table,
    row,
    mode,
    displayedColumns,
    error,
    errors,
    modeType,
    methods,
    newRow,
  } = props;

  const hideNullBtn = mode.type === "view" || props.hideNullBtn;

  const tableInfo = table.info;

  let fileManagerTop: React.ReactNode = null;
  if (tableInfo.isFileTable && tableInfo.fileTableName) {
    fileManagerTop = (
      <SmartFormFileSection
        {...props}
        table={table}
        newRowDataHandler={newRowDataHandler}
        row={row}
        action={mode}
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
        const newValue = newRow?.[c.name];
        const formFieldStyle: React.CSSProperties =
          !c.sectionHeader ? {} : { marginTop: "1em" };

        if (c.onRender) {
          const columnNode = c.onRender(rawValue, (newVal) =>
            newRowDataHandler.setColumnData(c.name, {
              type: "column",
              value: newVal,
            }),
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
            action={modeType}
            column={c}
            value={rawValue}
            newValue={newValue}
            row={row}
            jsonbSchemaWithControls={jsonbSchemaWithControls}
            onChange={(newColData) =>
              newRowDataHandler.setColumnData(c.name, newColData)
            }
            error={
              errors[c.name] ??
              (isObject(error) && error.column === c.name ? error : undefined)
            }
            rightContentAlwaysShow={false}
            methods={methods}
            hideNullBtn={hideNullBtn}
            sectionHeader={c.sectionHeader}
            style={formFieldStyle}
            enableInsert={enableInsert}
            newRowDataHandler={newRowDataHandler}
          />
        );
      })}
    </div>
  );
};
