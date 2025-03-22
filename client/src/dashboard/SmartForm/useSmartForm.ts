import { type TableHandlerClient } from "prostgles-client/dist/prostgles";
import { type AnyObject } from "prostgles-types";
import { useMemo, useState } from "react";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import type { SmartFormProps } from "./SmartForm";
import {
  useNewRowDataHandler,
  type SmartFormNewRowState,
} from "./useNewRowDataHandler";
import {
  useSmartFormColumns,
  type SmartFormColumnState,
} from "./useSmartFormColumns";
import { useSmartFormMode, type SmartFormModeState } from "./useSmartFormMode";

export type SmartFormState = {
  table: DBSchemaTableWJoins;
} & SmartFormModeState &
  SmartFormColumnState &
  SmartFormNewRowState;
export const useSmartForm = (props: SmartFormProps) => {
  const { db, tables, tableName, fixedData, rowFilter, defaultData } = props;

  const table = useMemo(() => {
    return tables.find((t) => t.name === tableName);
  }, [tables, tableName]);

  const tableHandler = db[tableName] as Partial<TableHandlerClient>;

  const modeResult = useSmartFormMode({ ...props, table });

  const { columns, displayedColumns } = useSmartFormColumns({
    ...props,
    table,
    ...modeResult,
  });

  const [referencedInsertData, setReferencedInsertData] = useState<AnyObject>(
    {},
  );

  const mediaTableInfo = useMemo(() => {
    const tableInfo = table?.info;
    if (tableInfo?.hasFiles && tableInfo.fileTableName) {
      return tables.find((t) => t.info.isFileTable)?.info;
    }
  }, [table, tables]);

  const newRowState = useNewRowDataHandler({
    ...modeResult,
    ...props,
    displayedColumns,
    columns,
    table,
  });

  return {
    ...modeResult,
    ...newRowState,
    table,
    tableHandler,
    referencedInsertData,
    setReferencedInsertData,
    columns,
    displayedColumns,
    mediaTableInfo,
  };
};
