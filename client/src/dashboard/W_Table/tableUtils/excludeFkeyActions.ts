import { resolveActionColumns } from "@common/resolveActionColumns";
import type { ColumnConfigWithInfo } from "@common/ColumnConfig/ColumnConfig";
import { resolveActionFunction } from "@common/resolveActionFunction";
import {
  isDefined,
  type DBSchemaTable,
  type ServerFunctionHandler,
} from "prostgles-types";
import { getColumnActions } from "../ColumnMenu/ColumnDisplayFormat/getFormatColumnSelect";

export const excludeFkeyActions = (
  columns: ColumnConfigWithInfo[],
  table: DBSchemaTable,
  methods: ServerFunctionHandler,
): ColumnConfigWithInfo[] => {
  const getBindingKey = (
    params: ReturnType<typeof resolveActionColumns>[number],
  ) => {
    if ("columnName" in params) return;
    const { action } = resolveActionFunction(methods, table, params);
    return action && JSON.stringify([action.methodName, action.argName]);
  };
  const fkeyActions = new Set(
    columns
      .filter(
        (column) =>
          column.show &&
          column.info?.references?.length &&
          !column.nested &&
          !column.computedConfig,
      )
      .flatMap((column) =>
        resolveActionColumns(getColumnActions(column) ?? [], methods, table),
      )
      .map(getBindingKey)
      .filter(isDefined),
  );
  if (!fkeyActions.size) return columns;
  const isDuplicate = (
    params: ReturnType<typeof resolveActionColumns>[number],
  ) => {
    const binding = getBindingKey(params);
    return binding && fkeyActions.has(binding);
  };
  return columns.flatMap((column) => {
    const { format } = column;
    if (column.info || column.nested || column.computedConfig) return [column];
    if (format?.type === "Action")
      return isDuplicate(format.params) ? [] : [column];
    if (format?.type !== "ActionColumns") return [column];
    const resolvedActions = resolveActionColumns(
      format.params.actions,
      methods,
      table,
    );
    const actions = resolvedActions.filter((params) => !isDuplicate(params));
    if (actions.length === resolvedActions.length) return [column];
    return actions.length ?
        [{ ...column, format: { ...format, params: { actions } } }]
      : [];
  });
};
