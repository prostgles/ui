import {
  useMemoDeep,
  usePromise,
  type TableHandlerClient,
} from "prostgles-client/dist/prostgles";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import { getSmartGroupFilter } from "../SmartFilter/smartFilterUtils";
import type { FormAction, SmartFormProps } from "./SmartForm";
import type { AnyObject, ValidatedColumnInfo } from "prostgles-types";
import { useMemo, useState } from "react";

export type SmartFormActionState = ReturnType<typeof useSmartFormAction>;
export const useSmartFormAction = ({
  tableName,
  lang,
  rowFilter,
  db,
  columns,
  table,
}: SmartFormProps & { table: DBSchemaTableWJoins | undefined }) => {
  const tableHandler = db[tableName] as Partial<TableHandlerClient> | undefined;
  const tableInfo = table?.info;

  const { action, error: actionError } = useMemo(() => {
    let action: FormAction = {
      type: "view",
      loading: true,
      dataItemLoaded: false,
      initialised: true,
    };
    if (!tableHandler?.getInfo || !tableHandler.getColumns || !tableInfo) {
      return {
        action: {
          ...action,
          loading: false,
        },
        error:
          "Table getInfo/getColumns hooks not available/published: " +
          tableName,
      };
    }
    if (rowFilter && (tableHandler.update || tableHandler.delete)) {
      // if (fixedData) {
      //   this.setState({ newRow: { ...fixedData } });
      // }
      action = {
        type: "update",
        isMultiUpdate: !rowFilter.length,
        loading: true,
        data: {},
        dataItemLoaded: false,
        initialised: true,
      };
    } else if (tableHandler.insert && !rowFilter) {
      action = {
        type: "insert",
        data: {},
        initialised: true,
      };
    }

    return {
      action,
      error: undefined,
    };
  }, [tableHandler, tableInfo, rowFilter, tableName]);

  const dynamicCols = usePromise(async () => {
    let getColParams: Parameters<TableHandlerClient["getColumns"]>[1];
    if (action.type === "update") {
      getColParams = {
        rule: "update",
        filter: getSmartGroupFilter(rowFilter),
      };
    }
    const dynamicValidatedColumns =
      !getColParams ?
        table?.columns
      : await tableHandler?.getColumns?.(lang, getColParams);

    const invalidColumns =
      columns &&
      dynamicValidatedColumns &&
      Object.keys(columns).filter(
        (colName) => !dynamicValidatedColumns.some((_c) => _c.name === colName),
      );
    return {
      dynamicValidatedColumns,
      error:
        invalidColumns?.length ?
          "Some requested columns not found in the table: " +
          JSON.stringify(invalidColumns)
        : undefined,
    };
  }, [action.type, rowFilter, table?.columns, lang, columns, tableHandler]);

  const actionWithData = usePromise(async () => {
    if (action.type === "insert" || !rowFilter?.length) return action;
    const row = await tableHandler?.find?.(getSmartGroupFilter(rowFilter), {
      select: await getSelect(),
    });
    return {
      ...action,
      loading: false,
      data: row,
      dataItemLoaded: true,
    };
  }, [action, tableHandler, rowFilter]);

  return {
    action: actionWithData ?? action,
    dynamicValidatedColumns: dynamicCols?.dynamicValidatedColumns,
    error: actionError || dynamicCols?.error,
  };
};
