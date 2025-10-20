import {
  useAsyncEffectQueue,
  useEffectDeep,
  type TableHandlerClient,
} from "prostgles-client/dist/prostgles";
import { type AnyObject } from "prostgles-types";
import { useEffect, useMemo, useState } from "react";
import {
  getSmartGroupFilter,
  type DetailedFilterBase,
} from "../../../../common/filterUtils";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import type { SmartFormProps } from "./SmartForm";

export type SmartFormMode =
  | {
      type: "view" | "update";
      currentRow: AnyObject | undefined;
      loading: boolean;
      rowFilter: DetailedFilterBase[];
      rowFilterObj: AnyObject;
      select: AnyObject;
      clone: VoidFunction | undefined;
      tableHandlerFindOne: TableHandlerClient["findOne"];
      tableHandlerSubscribeOne: undefined | TableHandlerClient["subscribeOne"];
      tableHandlerUpdate: undefined | TableHandlerClient["update"];
      tableHandlerDelete: undefined | TableHandlerClient["delete"];
      tableHandlerGetColumns: TableHandlerClient["getColumns"];
    }
  | {
      type: "multiUpdate";
      rowFilter: DetailedFilterBase[];
      rowFilterObj: AnyObject;
      tableHandlerUpdate: undefined | TableHandlerClient["update"];
      tableHandlerDelete: undefined | TableHandlerClient["delete"];
    }
  | ({
      type: "insert";
      tableHandlerInsert: TableHandlerClient["insert"] | undefined;
    } & (
      | {
          clonedRow: AnyObject;
          cancelClone: VoidFunction;
        }
      | {
          clonedRow?: undefined;
          cancelClone?: undefined;
        }
    ))
  | {
      type: "manual";
    };

type ModeOrError = SmartFormMode | string;

export type SmartFormModeState = Omit<
  ReturnType<typeof useSmartFormMode>,
  "mode"
> & {
  mode: SmartFormMode;
  modeType: "view" | "update" | "insert" | undefined;
};
export const useSmartFormMode = (
  props: Pick<
    SmartFormProps,
    "tableName" | "db" | "rowFilter" | "onChange" | "parentForm" | "onLoaded"
  > & {
    table: DBSchemaTableWJoins | undefined;
  },
) => {
  const { tableName, rowFilter, db, table, onChange, parentForm, onLoaded } =
    props;
  const [loading, setLoading] = useState(false);
  const tableHandler = db[tableName] as Partial<TableHandlerClient> | undefined;
  const tableInfo = table?.info;
  const [localRowFilter, setLocalRowFilter] = useState(rowFilter);
  useEffectDeep(() => {
    setLocalRowFilter(rowFilter);
  }, [rowFilter, tableName]);
  const [clonedRow, setClonedRow] = useState<AnyObject>();
  const [currentRowInfo, setCurrentRowInfo] = useState<{
    row: AnyObject;
    tableName: string;
  }>();

  useEffect(() => {
    if (currentRowInfo) {
      onLoaded?.();
    }
  }, [currentRowInfo, onLoaded]);

  const tableHandlerUpdate = tableHandler?.update;
  const tableHandlerDelete = tableHandler?.delete;
  const tableHandlerInsert = tableHandler?.insert;
  const tableHandlerGetInfo = tableHandler?.getInfo;
  const tableHandlerFindOne = tableHandler?.findOne;
  const tableHandlerSubscribeOne = tableHandler?.subscribeOne;
  const tableHandlerGetColumns = tableHandler?.getColumns;
  const isManuallyControlled = Boolean(onChange || parentForm);
  const activeRowFilter = localRowFilter || rowFilter;

  const modeOrError: ModeOrError = useMemo(() => {
    if (!tableHandlerGetInfo || !tableHandlerGetColumns || !tableInfo) {
      return ("Table getInfo/getColumns hooks not available/published: " +
        tableName) satisfies ModeOrError;
    }
    if (rowFilter) {
      if (clonedRow) {
        if (!tableHandlerInsert) return "Not allowed to insert";
        return {
          type: "insert",
          clonedRow,
          tableHandlerInsert,
          cancelClone: () => {
            setClonedRow(undefined);
          },
        } satisfies ModeOrError;
      }
      if (!rowFilter.length) {
        if (!tableHandlerUpdate && !tableHandlerDelete) {
          return "Now allowed to update or delete records from this table";
        }
        return {
          type: "multiUpdate",
          tableHandlerDelete,
          tableHandlerUpdate,
          rowFilter: [],
          rowFilterObj: {},
        } satisfies ModeOrError;
      }

      if (!tableHandlerFindOne) {
        return "Not allowed to view data";
      }

      const currentRow =
        currentRowInfo?.tableName === tableName ?
          currentRowInfo.row
        : undefined;
      const select = { "*": 1 } as const;

      if (
        tableInfo.fileTableName &&
        tableInfo.fileTableName !== tableName &&
        tableInfo.hasFiles &&
        db[tableInfo.fileTableName]?.find
      ) {
        select[tableInfo.fileTableName] = "*";
      }

      return {
        type: tableHandlerUpdate ? "update" : "view",
        clone:
          tableHandlerInsert && currentRow ?
            () => setClonedRow(currentRow)
          : undefined,
        currentRow,
        rowFilter: activeRowFilter!,
        rowFilterObj: getSmartGroupFilter(activeRowFilter),
        select,
        loading: !currentRow,
        tableHandlerFindOne,
        tableHandlerSubscribeOne,
        tableHandlerDelete,
        tableHandlerUpdate,
        tableHandlerGetColumns,
      } satisfies ModeOrError;
    } else {
      if (isManuallyControlled) {
        return {
          type: "insert",
          tableHandlerInsert,
        } satisfies ModeOrError;
      }
      if (!tableHandlerInsert) {
        return "Cannot insert. Check longs";
      }
      return {
        type: "insert",
        tableHandlerInsert,
      } satisfies ModeOrError;
    }
    //@ts-ignore
  }, [
    tableInfo,
    rowFilter,
    tableName,
    isManuallyControlled,
    db,
    tableHandlerFindOne,
    tableHandlerGetInfo,
    tableHandlerSubscribeOne,
    tableHandlerGetColumns,
    tableHandlerUpdate,
    tableHandlerDelete,
    tableHandlerInsert,
    clonedRow,
    activeRowFilter,
    currentRowInfo,
  ]);

  const mode = typeof modeOrError === "string" ? undefined : modeOrError;
  const select =
    mode?.type === "view" || mode?.type === "update" ? mode.select : undefined;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useAsyncEffectQueue(async () => {
    if (!select) return;
    const filter = getSmartGroupFilter(activeRowFilter);
    if (tableHandlerSubscribeOne) {
      const sub = await tableHandlerSubscribeOne(filter, { select }, (row) => {
        row &&
          setCurrentRowInfo({
            row,
            tableName,
          });
      });
      return sub.unsubscribe;
    } else if (tableHandlerFindOne) {
      const row = await tableHandlerFindOne(filter, {
        select,
      });
      row &&
        setCurrentRowInfo({
          row,
          tableName,
        });
    }
  }, [
    select,
    tableName,
    activeRowFilter,
    tableHandlerFindOne,
    tableHandlerSubscribeOne,
  ]);

  const error = typeof modeOrError === "string" ? modeOrError : undefined;
  return {
    mode,
    modeType: mode?.type === "multiUpdate" ? "update" : mode?.type,
    error,
    setLocalRowFilter,
    localRowFilter,
    loading,
    setLoading,
  };
};
