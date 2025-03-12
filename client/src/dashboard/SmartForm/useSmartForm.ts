import {
  useEffectDeep,
  type TableHandlerClient,
} from "prostgles-client/dist/prostgles";
import { ProstglesError, type AnyObject } from "prostgles-types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSmartGroupFilter } from "../SmartFilter/smartFilterUtils";
import type { SmartFormProps } from "./SmartForm";
import { parseDefaultValue } from "./SmartFormField/fieldUtils";
import { SmartFormActionState, useSmartFormAction } from "./useSmartFormAction";
import { useSmartFormColumns } from "./useSmartFormColumns";
import { useSmartFormSetColumn } from "./useSmartFormSetColumn";
import { useSmartFormError } from "./useSmartFormError";

export type SmartFormStateV2 = ReturnType<typeof useSmartForm>;
export const useSmartForm = (props: SmartFormProps) => {
  const {
    db,
    tables,
    tableName,
    fixedData,
    rowFilter,
    includeMedia = true,
    defaultData = {},
  } = props;
  const table = useMemo(() => {
    return tables.find((t) => t.name === tableName);
  }, [tables, tableName]);

  const tableHandler = db[tableName] as Partial<TableHandlerClient>;

  const actionState = useSmartFormAction({ ...props, table });

  const { columns, displayedColumns } = useSmartFormColumns({
    ...props,
    table,
    ...actionState,
  });

  const [newRow, setNewRow] = useState(fixedData);
  useEffectDeep(() => {
    setNewRow(fixedData);
  }, [fixedData, rowFilter, tableName]);

  const [localRowFilter, setLocalRowFilter] = useState(rowFilter);
  useEffectDeep(() => {
    setLocalRowFilter(rowFilter);
  }, [rowFilter, tableName]);

  const [referencedInsertData, setReferencedInsertData] = useState<AnyObject>(
    {},
  );

  const { action } = actionState;
  const getThisRow = useCallback((): AnyObject => {
    const getDefaultColumnData = () => {
      const defaultColumnData = {};
      if (!rowFilter) {
        columns.forEach((c) => {
          defaultColumnData[c.name] = parseDefaultValue(c, undefined, false);
        });
      }

      return defaultColumnData;
    };
    return action.type === "insert" ?
        {
          ...getDefaultColumnData(),
          ...defaultData,
          ...action.clonedRow,
          ...newRow,
          ...fixedData,
        }
      : {
          ...action.currentRow,
          ...defaultData,
          ...newRow,
          ...fixedData,
        };
  }, [action, columns, defaultData, newRow, fixedData, rowFilter]);

  const getSelect = useCallback(async () => {
    const tableInfo = table?.info;
    const select = { $rowhash: 1, "*": 1 } as const;

    if (
      includeMedia &&
      tableInfo?.fileTableName &&
      tableInfo.fileTableName !== tableName &&
      tableInfo.hasFiles &&
      db[tableInfo.fileTableName]?.find
    ) {
      select[tableInfo.fileTableName] = "*";
    }
    return select;
  }, [includeMedia, table?.info, tableName, db]);

  const getRowFilter = useCallback((): AnyObject | undefined => {
    const f = localRowFilter || rowFilter;
    if (!f) return undefined;
    return getSmartGroupFilter(f);
  }, [localRowFilter, rowFilter]);

  const getRow = useCallback(async () => {
    return db[tableName]?.find?.(getRowFilter(), {
      select: await getSelect(),
    });
  }, [db, tableName, getRowFilter, getSelect]);

  const getValidatedRowFilter = useCallback(async () => {
    const rowFilter = getRowFilter();
    const rws = await getRow();
    return rowFilter;
  }, [getRowFilter, getRow]);

  const { setColumnData } = useSmartFormSetColumn({
    ...props,
    state: actionState,
  });

  const mediaTableInfo = useMemo(() => {
    const tableInfo = table?.info;
    if (tableInfo?.hasFiles && tableInfo.fileTableName && includeMedia) {
      return tables.find((t) => t.info.isFileTable)?.info;
    }
  }, [includeMedia, table, tables]);

  const errorState = useSmartFormError(columns);
  return {
    ...actionState,
    ...errorState,
    getThisRow,
    newRow,
    setNewRow,
    table,
    tableHandler,
    localRowFilter,
    setLocalRowFilter,
    getValidatedRowFilter,
    getRow,
    getRowFilter,
    getSelect,
    referencedInsertData,
    setReferencedInsertData,
    setColumnData,
    columns,
    displayedColumns,
    mediaTableInfo,
  };
};
