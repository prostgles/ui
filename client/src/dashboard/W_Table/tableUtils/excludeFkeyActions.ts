import type { ActionColumnsParams } from "@common/actionColumn";
import type { ColumnConfigWithInfo } from "@common/ColumnConfig/ColumnConfig";
import {
  getActionFunctions,
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
  const availableActions = getActionFunctions(methods, table);
  const getBinding = (params: ActionColumnsParams["actions"][number]) => {
    if ("columnName" in params) return;
    const matches = availableActions.filter(
      (action) =>
        action.methodName === params.methodName &&
        (!params.argName || action.argName === params.argName),
    );
    return matches.length === 1 ? matches[0] : undefined;
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
      .flatMap((column) => getColumnActions(column) ?? [])
      .map(getBinding)
      .filter(isDefined),
  );
  if (!fkeyActions.size) return columns;
  const isDuplicate = (params: ActionColumnsParams["actions"][number]) => {
    const binding = getBinding(params);
    return binding && fkeyActions.has(binding);
  };
  return columns.flatMap((column) => {
    const { format } = column;
    if (column.info || column.nested || column.computedConfig) return [column];
    if (format?.type === "Action")
      return isDuplicate(format.params) ? [] : [column];
    if (format?.type !== "ActionColumns") return [column];
    const actions = format.params.actions.filter(
      (params) => !isDuplicate(params),
    );
    if (actions.length === format.params.actions.length) return [column];
    return actions.length ?
        [{ ...column, format: { ...format, params: { actions } } }]
      : [];
  });
};
