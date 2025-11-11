import {
  getSerialisableError,
  isDefined,
  isEmpty,
  isEqual,
  isObject,
  omitKeys,
  type AnyObject,
  type ProstglesError,
  type ValidatedColumnInfo,
} from "prostgles-types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getKeys } from "../../utils";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import type { getErrorsHook, SmartFormProps } from "./SmartForm";
import { parseDefaultValue } from "./SmartFormField/fieldUtils";
import type { SmartColumnInfo } from "./SmartFormField/SmartFormField";
import {
  NewRowDataHandler,
  type ColumnData,
  type NewRow,
} from "./SmartFormNewRowDataHandler";
import type { useSmartFormMode } from "./useSmartFormMode";

type Args = {
  columns: ValidatedColumnInfo[];
  table: DBSchemaTableWJoins | undefined;
  displayedColumns: SmartColumnInfo[];
} & ReturnType<typeof useSmartFormMode> &
  Pick<
    SmartFormProps,
    | "defaultData"
    | "rowFilter"
    | "fixedData"
    | "confirmUpdates"
    | "onChange"
    | "onSuccess"
    | "parentForm"
  >;

export const useNewRowDataHandler = (args: Args) => {
  const {
    rowFilter,
    fixedData,
    defaultData,
    confirmUpdates,
    displayedColumns,
    onChange,
    onSuccess,
    columns,
    mode,
    table,
    setLocalRowFilter,
    parentForm,
  } = args;
  const [error, setError] = useState<any>();
  const [errors, setErrors] = useState<AnyObject>({});
  const columnMap = useMemo(() => {
    const colMap: Map<string, ValidatedColumnInfo> = new Map();
    columns.forEach((c) => {
      colMap.set(c.name, c);
    });
    return colMap;
  }, [columns]);

  const [newRowData, setNewRowData] = useState<NewRow>();
  const parseError = useCallback(
    (error: ProstglesError) => {
      let newError: string =
        typeof error === "string" ? error : (
          [
            error.table ? `${error.table}: ` : "",
            error.detail ? error.detail + "\n" : "",
            error.message || error.txt,
          ]
            .filter(Boolean)
            .join("\n") ||
          JSON.stringify(getSerialisableError(error)) ||
          "Unknown error"
        );
      const newErrors: AnyObject = {};
      if (isObject(error) && error.code === "23503" && error.table) {
        console.log(error);
        newError =
          error.detail ||
          `Table ${error.table} has rows that reference this record (foreign_key_violation)\n\n${error.message || ""}`;
      } else if (Object.keys(error).length && error.constraint) {
        let cols: string[] = [];
        if (error.columns) {
          cols = error.columns;
        } else if (error.column) {
          cols = [error.column];
        }
        cols.forEach((c) => {
          if (columns.find((col) => col.name === c)) {
            let message = error.constraint;
            if (error.code_info === "unique_violation") {
              message =
                "Value already exists. \nConstraint: " + error.constraint;
            }
            newErrors[c] = message;
          }
        });
      }

      if (Object.keys(newErrors).length) {
        newError = error.message || error.detail || "Unknown error";
        setErrors(newErrors);
      }
      setError(newError);
    },
    [columns],
  );
  const onSetColumnData = useCallback(
    async (newRow: NewRow, columnName: string, newVal: ColumnData) => {
      const column = columnMap.get(columnName);

      if (!mode) throw "unexpected";
      /* Remove updates that change nothing */
      if (mode.type === "update" && mode.currentRow) {
        const { currentRow } = mode;
        getKeys(newRow).forEach((key) => {
          if (newRow[key] === currentRow[key] && key in currentRow) {
            delete newRow[key];
          }
        });
      }

      /* Remove empty updates (user deleted a non text column) */
      if (
        column &&
        newVal.type === "column" &&
        newVal.value === "" &&
        column.tsDataType !== "string"
      ) {
        delete newRow[column.name];
      }

      if (
        !onChange &&
        (mode.type === "update" || mode.type === "multiUpdate") &&
        !confirmUpdates
      ) {
        try {
          const newRow = await mode.tableHandlerUpdate?.(
            mode.rowFilterObj,
            { [columnName]: newVal.value },
            { returning: "*" },
          );
          onSuccess?.("update", newRow as any);
        } catch (_e: any) {
          parseError(_e);
          throw _e;
          // This triggered clearing the error before it could be shown
          // return newRow;
        }
      }

      /** Update rowFilter to ensure the record does not dissapear after updating */
      if (
        !confirmUpdates &&
        rowFilter &&
        column?.is_pkey &&
        rowFilter.find((f) => f.fieldName === column.name)
      ) {
        setLocalRowFilter(
          rowFilter.map((f) =>
            f.fieldName === column.name ? { ...f, value: newVal } : f,
          ),
        );
      }
      onChange?.(newRow);

      if (columnName in errors) {
        setErrors(omitKeys(errors, [columnName]));
      }

      return newRow;
    },
    [
      columnMap,
      confirmUpdates,
      errors,
      mode,
      onChange,
      onSuccess,
      rowFilter,
      setErrors,
      setLocalRowFilter,
      parseError,
    ],
  );

  const [newRowDataHandler] = useState(
    new NewRowDataHandler(undefined, {
      onChange: onSetColumnData,
      onChanged: setNewRowData,
    }),
  );
  newRowDataHandler.setHandlers({
    onChange: onSetColumnData,
    onChanged: (newRow) => setNewRowData({ ...newRow }),
  });

  const [newRow, setNewRow] = useState<AnyObject>();
  useEffect(() => {
    const newRow = newRowDataHandler.getRow();
    setNewRow(newRow);
    setErrors({});
    setError(undefined);
  }, [newRowData, newRowDataHandler]);

  const clonedRow = mode?.type === "insert" ? mode.clonedRow : undefined;

  useEffect(() => {
    if (mode?.type !== "insert") {
      return;
    }
    /** Set existing data from parentForm */
    if (parentForm?.type === "insert") {
      const existingData = parentForm.newRowDataHandler?.getNewRow();
      if (existingData) {
        newRowDataHandler.setNewRow(existingData);
        return;
      }
    }
    const defaultColumnData = Object.fromEntries(
      columns
        .map((c) => {
          const value = parseDefaultValue(c, undefined, false);
          if (value === undefined) return;
          return [c.name, value];
        })
        .filter(isDefined),
    );
    const newRowWithDefaultData = Object.fromEntries(
      Object.entries({
        ...defaultColumnData,
        ...clonedRow,
        ...defaultData,
        ...fixedData,
      }).map(([key, value]) => [
        key,
        { type: "column", value } satisfies ColumnData,
      ]),
    );
    newRowDataHandler.setNewRow(newRowWithDefaultData);
  }, [
    mode?.type,
    columns,
    fixedData,
    defaultData,
    clonedRow,
    newRowDataHandler,
    parentForm,
  ]);

  const row = useMemo(() => {
    if (!mode) return {};
    if (mode.type === "insert") {
      return {
        ...mode.clonedRow,
        ...newRow,
        ...fixedData,
      };
    }
    if (mode.type === "view") {
      return {
        ...mode.currentRow,
      };
    }
    return {
      ...(mode.type === "update" ? mode.currentRow : {}),
      ...newRow,
      ...fixedData,
    };
  }, [newRow, mode, fixedData]);

  const getErrors: getErrorsHook = useCallback(
    async (cb) => {
      const cannotBeNullMessage = "Must not be empty";
      const data = {
        ...newRow,
        ...fixedData,
      };
      let _errors: AnyObject | undefined;

      const tableInfo = table?.info;

      displayedColumns
        .filter((c) => c.insert || c.update)
        .forEach((c) => {
          const val = data[c.name];

          /* Check against not null rules */
          if (!c.is_nullable) {
            const isNull = (v) => [undefined, null].includes(v);

            const willInsertMedia =
              tableInfo?.hasFiles &&
              tableInfo.fileTableName &&
              c.references?.some((r) => r.ftable === tableInfo.fileTableName) &&
              data[tableInfo.fileTableName]?.length;
            if (
              /* If it's an insert then ensure all non nullable cols are filled */
              (!rowFilter &&
                isNull(val) &&
                !c.has_default &&
                !willInsertMedia) ||
              /* If update then ensure not updating non nullable with null  */
              val === null
            ) {
              _errors ??= {};
              _errors[c.name] = cannotBeNullMessage;
            }
          }

          /** Ensure json fields are not string */
          if (c.udt_name.startsWith("json") && typeof val === "string") {
            try {
              data[c.name] = JSON.parse(val);
            } catch (error) {
              _errors ??= {};
              _errors[c.name] = "Must be a valid json";
            }
          }
        });

      table?.info.requiredNestedInserts?.forEach(
        ({ ftable, maxRows, minRows }) => {
          const ftableData = data[ftable];
          if (!ftableData || !Array.isArray(ftableData) || !ftableData.length) {
            _errors ??= {};
            _errors[ftable] = "Required";
          } else if (minRows && ftableData.length < minRows) {
            _errors ??= {};
            _errors[ftable] = `Must have at least ${minRows} rows`;
          } else if (maxRows && ftableData.length > maxRows) {
            _errors ??= {};
            _errors[ftable] = `Must have at most ${maxRows} rows`;
          }
        },
      );

      if (!_errors) {
        const errors = await cb(data);

        if (errors && !isEmpty(errors)) {
          setErrors(errors);
        }
      } else {
        setErrors(_errors);
      }
    },
    [fixedData, rowFilter, table, newRow, displayedColumns],
  );

  return {
    error,
    errors,
    setError,
    setErrors,
    parseError,
    getErrors,
    newRowDataHandler,
    newRowData,
    newRow,
    row,
  };
};

export type SmartFormNewRowState = ReturnType<typeof useNewRowDataHandler>;
