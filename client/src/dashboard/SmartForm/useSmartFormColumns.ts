import { quickClone } from "prostgles-client/dist/SyncedTable/SyncedTable";
import { getKeys, isDefined, type ValidatedColumnInfo } from "prostgles-types";
import { useMemo } from "react";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import type { SmartFormProps } from "./SmartForm";
import type { SmartColumnInfo } from "./SmartFormField/SmartFormField";
import type { useSmartFormMode } from "./useSmartFormMode";
import { usePromise } from "prostgles-client/dist/react-hooks";

type UseSmartFormColumnsProps = Pick<
  SmartFormProps,
  "fixedData" | "columnFilter" | "columns" | "hideNonUpdateableColumns" | "lang"
> &
  Pick<ReturnType<typeof useSmartFormMode>, "mode"> & {
    table: DBSchemaTableWJoins | undefined;
  };
export const useSmartFormColumns = (props: UseSmartFormColumnsProps) => {
  const {
    fixedData,
    columns,
    columnFilter,
    table,
    mode,
    lang,
    hideNonUpdateableColumns,
  } = props;

  const dynamicValidatedColumns = usePromise(async () => {
    if (!mode) return undefined;
    const result =
      mode.type !== "update" ?
        table?.columns
      : await mode.tableHandlerGetColumns(lang, {
          rule: "update",
          filter: mode.rowFilterObj,
        });

    const invalidColumns =
      columns &&
      result &&
      Object.keys(columns).filter(
        (colName) => !result.some((_c) => _c.name === colName),
      );
    const warning =
      invalidColumns?.length ?
        "Some requested columns not found in the table: " +
        JSON.stringify(invalidColumns)
      : undefined;
    if (warning) {
      console.error(warning);
    }
    return result;
  }, [mode, table?.columns, lang, columns]);

  const smartCols: SmartColumnInfo[] = useMemo(() => {
    if (!mode) return [];
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

    if (mode.type === "multiUpdate") {
      displayedCols = displayedCols.filter((c) => c.update);
    }

    return displayedCols;
  }, [columns, columnFilter, dynamicValidatedColumns, table, mode, fixedData]);

  const modeType = mode?.type;
  const displayedColumns = useMemo(() => {
    if (table?.info.isFileTable && modeType === "insert") {
      return [];
    }

    const validatedCols = smartCols.slice(0);
    const displayedCols = validatedCols;

    return displayedCols.filter(
      (c) =>
        (modeType === "view" && c.select) ||
        ((modeType === "update" || modeType === "multiUpdate") &&
          (c.update || (!hideNonUpdateableColumns && c.select))) ||
        (modeType === "insert" && c.insert),
    );
  }, [smartCols, modeType, hideNonUpdateableColumns, table?.info.isFileTable]);

  return {
    columns: smartCols,
    displayedColumns,
  };
};
export type SmartFormColumnState = ReturnType<typeof useSmartFormColumns>;
