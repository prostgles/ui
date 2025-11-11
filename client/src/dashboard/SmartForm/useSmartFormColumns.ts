import { usePromise } from "prostgles-client/dist/react-hooks";
import { quickClone } from "prostgles-client/dist/SyncedTable/SyncedTable";
import { getKeys, isDefined } from "prostgles-types";
import { useMemo } from "react";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import type { SmartFormProps } from "./SmartForm";
import type { SmartColumnInfo } from "./SmartFormField/SmartFormField";
import type { useSmartFormMode } from "./useSmartFormMode";

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
    columns: columnsConfig,
    columnFilter,
    table,
    mode,
    lang,
    hideNonUpdateableColumns,
  } = props;

  const dynamicValidatedColumns = usePromise(async () => {
    if (!mode) return undefined;
    /** TODO: merge with display_options?.prettyTableAndColumnNames */
    const result =
      mode.type !== "update" ?
        table?.columns
      : (
          await mode.tableHandlerGetColumns(lang, {
            rule: "update",
            filter: mode.rowFilterObj,
          })
        )
          .map((vc) => {
            const col = table?.columns.find((c) => c.name === vc.name);
            if (!col) return undefined;
            return {
              ...col,
              ...vc,
            };
          })
          .filter(isDefined);

    const invalidColumns =
      columnsConfig &&
      result &&
      Object.keys(columnsConfig).filter(
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
  }, [mode, table?.columns, lang, columnsConfig]);

  const smartCols: SmartColumnInfo[] = useMemo(() => {
    if (!mode) return [];
    let validatedCols = quickClone(dynamicValidatedColumns || []);
    if (fixedData) {
      const fixedFields = getKeys(fixedData);
      validatedCols = validatedCols.map((c) => ({
        ...c,
        insert: fixedFields.includes(c.name) ? false : c.insert,
      }));
    }
    let displayedCols = validatedCols as SmartColumnInfo[];

    if (columnsConfig) {
      /** Add headers */
      displayedCols = Object.entries(columnsConfig)
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
  }, [columnsConfig, columnFilter, dynamicValidatedColumns, mode, fixedData]);

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
