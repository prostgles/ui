import { quickClone } from "prostgles-client/dist/SyncedTable/SyncedTable";
import { getKeys, isDefined, type ValidatedColumnInfo } from "prostgles-types";
import { useMemo } from "react";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import type { SmartFormProps } from "./SmartForm";
import type { SmartColumnInfo } from "./SmartFormField/SmartFormField";
import type { ColumnDisplayConfig } from "./SmartFormV2";
import type { useSmartFormAction } from "./useSmartFormAction";

type UseSmartFormColumnsProps = Pick<
  SmartFormProps,
  "fixedData" | "columnFilter" | "columns" | "hideNonUpdateableColumns"
> &
  ReturnType<typeof useSmartFormAction> & {
    table: DBSchemaTableWJoins | undefined;
  };
export const useSmartFormColumns = (props: UseSmartFormColumnsProps) => {
  const {
    fixedData,
    columns,
    columnFilter,
    dynamicValidatedColumns,
    table,
    action,
    hideNonUpdateableColumns,
  } = props;

  const smartCols: (ValidatedColumnInfo & ColumnDisplayConfig)[] =
    useMemo(() => {
      let validatedCols = quickClone(
        dynamicValidatedColumns || table?.columns || [],
      );
      if (fixedData) {
        const fixedFields = getKeys(fixedData);
        validatedCols = validatedCols.map((c) => ({
          ...c,
          insert: fixedFields.includes(c.name) ? false : c.insert,
        }));
      }
      let displayedCols = validatedCols as SmartColumnInfo[];

      if (columns) {
        /** Add headers */
        displayedCols = Object.entries(columns)
          .map(([colName, colConf]) => {
            if (colConf === 1) {
              return validatedCols.find((c) => c.name === colName);
            } else {
              const ec = validatedCols.find((c) => c.name === colName);
              if (!ec) return undefined;

              return { ...ec, ...colConf };
            }
          })
          .filter(isDefined);
      } else if (columnFilter) {
        displayedCols = displayedCols.filter(columnFilter);
      }

      if (action.type === "update" && action.isMultiUpdate) {
        displayedCols = displayedCols.filter((c) => c.update);
      }

      return displayedCols;
    }, [
      columns,
      columnFilter,
      dynamicValidatedColumns,
      table,
      action,
      fixedData,
    ]);

  const displayedColumns = useMemo(() => {
    if (table?.info.isFileTable && action.type === "insert") {
      return [];
    }

    const validatedCols = smartCols.slice(0);
    const displayedCols = validatedCols;

    return displayedCols.filter(
      (c) =>
        (action.type === "view" && c.select) ||
        (action.type === "update" &&
          (c.update || (!hideNonUpdateableColumns && c.select))) ||
        (action.type === "insert" && c.insert),
    );
  }, [
    smartCols,
    action.type,
    hideNonUpdateableColumns,
    table?.info.isFileTable,
  ]);

  return {
    columns: smartCols,
    displayedColumns,
  };
};
