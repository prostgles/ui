import type {
  AnyObject,
  TableInfo,
  ValidatedColumnInfo,
} from "prostgles-types";
import { getPossibleNestedInsert } from "prostgles-types";
import React, { useMemo, useState } from "react";
import type { ColumnData, SmartFormProps } from "../SmartForm";
import type { SmartFormFieldProps } from "./SmartFormField";
import { SmartFormFieldLinkedDataInsert } from "./SmartFormFieldLinkedDataInsert";
import { SmartFormFieldLinkedDataSearch } from "./SmartFormFieldLinkedDataSearch";

export type SmartFormFieldLinkedDataProps = Pick<
  SmartFormProps,
  | "db"
  | "tables"
  | "methods"
  | "hideNullBtn"
  | "enableInsert"
  | "onSuccess"
  | "tableName"
  | "jsonbSchemaWithControls"
> &
  Pick<SmartFormFieldProps, "newValue"> & {
    column: ValidatedColumnInfo;
    row: AnyObject;
    tableInfo: TableInfo;
    action: "update" | "insert" | "view";
    setData: (newVal: ColumnData) => void;
  };

export const SmartFormFieldLinkedData = (
  props: SmartFormFieldLinkedDataProps & {
    state: SmartFieldForeignKeyOptionsState;
    readOnly: boolean;
  },
) => {
  const { setData, state, db, tables, methods, readOnly } = props;

  if (!state) return null;
  return (
    <div className="SmartFormFieldOptions flex-row">
      {state.showSearchState && (
        <SmartFormFieldLinkedDataSearch
          setData={setData}
          tables={tables}
          methods={methods}
          db={db}
          readOnly={readOnly}
          {...state.showSearchState}
        />
      )}
      {state.showInsertState && (
        <SmartFormFieldLinkedDataInsert {...props} {...state.showInsertState} />
      )}
    </div>
  );
};

const useSmartFieldForeignKeyOptionsState = ({
  column,
  action,
  db,
  tables,
  enableInsert,
  setShowNestedInsertForm,
  showNestedInsertForm,
}: Pick<
  SmartFormFieldProps,
  "column" | "action" | "db" | "tables" | "enableInsert"
> &
  SmartFormFieldLinkedDataInsertState) => {
  return useMemo(() => {
    const ref = getPossibleNestedInsert(column, tables);
    const fileTableName = tables[0]?.info.fileTableName;
    const ftable =
      ref?.ftable ?? (column.file && fileTableName ? fileTableName : undefined);
    const fTableCols =
      ftable ? tables.find((t) => t.name === ftable)?.columns : undefined;
    const ftableHandler =
      ftable && column.references?.length ? db[ftable] : undefined;
    const fcol = ref?.fcols[ref.cols.indexOf(column.name)];
    if (!ftable || !fcol) return undefined;
    const showInsertState =
      enableInsert && ftableHandler?.insert ?
        {
          ftable,
          fcol,
          setShowNestedInsertForm,
          showNestedInsertForm,
        }
      : undefined;

    const hasMultipleCols = fTableCols && fTableCols.length > 1;
    /** No point showing full table search when there is only 1 column */
    const showSearchState =
      action !== "view" && ftableHandler?.find && hasMultipleCols ?
        { ftable, fcol }
      : undefined;

    if (!showInsertState && !showSearchState) {
      return undefined;
    }

    return {
      showSearchState,
      showInsertState,
    };
  }, [
    column,
    tables,
    db,
    enableInsert,
    action,
    setShowNestedInsertForm,
    showNestedInsertForm,
  ]);
};
export type SmartFieldForeignKeyOptionsState = ReturnType<
  typeof useSmartFieldForeignKeyOptionsState
>;

export const useSmartFormFieldForeignDataState = ({
  column,
  readOnly,
  row,
  action,
  db,
  tables,
  enableInsert,
}: Pick<
  SmartFormFieldProps,
  "column" | "row" | "action" | "db" | "tables" | "enableInsert"
> & {
  readOnly: boolean;
}) => {
  const [showNestedInsertForm, setShowNestedInsertForm] = useState(false);

  const insertAndSearchState = useSmartFieldForeignKeyOptionsState({
    column,
    action,
    db,
    tables,
    enableInsert,
    setShowNestedInsertForm,
    showNestedInsertForm,
  });
  const showSmartFormFieldLinkedData = !readOnly && action && row;

  const showSmartFormFieldForeignKey =
    !!column.references?.length && !column.is_pkey;
  if (!showSmartFormFieldLinkedData && !showSmartFormFieldForeignKey) return;

  return {
    insertAndSearchState,
    showNestedInsertForm,
    setShowNestedInsertForm,
    showSmartFormFieldLinkedData,
    showSmartFormFieldForeignKey,
  };
};

export type SmartFormFieldLinkedDataInsertState = {
  showNestedInsertForm: boolean;
  setShowNestedInsertForm: (show: boolean) => void;
};
// throw "Must fix referenced image column nested chain. Ensure it doesn't need a press on Update on parent row"
