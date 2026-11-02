import type {
  ActionColumnParams,
  ActionColumnsParams,
} from "@common/actionColumn";
import type { ActionColumnValue } from "@common/createActionColumn";
import { resolveActionColumns } from "@common/resolveActionColumns";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { AnyObject, DBSchemaTable } from "prostgles-types";
import React from "react";
import { ActionButton } from "./ActionButton";
import { getActionButtonState } from "./getActionButtonState";

export const ActionColumns = ({
  params,
  row,
  dataKey,
  table,
}: {
  params: ActionColumnsParams | ActionColumnParams;
  row: AnyObject;
  dataKey: string;
  table: DBSchemaTable;
}) => {
  const { methods } = usePrgl();
  const sourceRow = row[dataKey] as AnyObject | undefined;
  const resolvedActions = resolveActionColumns(
    "actions" in params ? params.actions : [params],
    methods,
    table,
  );
  const actions = resolvedActions.map(
    (action, index) => {
      const stateKey = "actions" in params ? `${dataKey}_${index}` : dataKey;
      if ("columnName" in action) {
        const column = table.columns.find(
          ({ name, select }) => name === action.columnName && select,
        );
        const value = sourceRow?.[
          action.columnName
        ] as ActionColumnValue | null;
        if (!column || !value) return;
        const defaults = column.jsonbSchema?.defaultValue as
          ActionColumnValue | undefined;
        const methodName = value.methodName ?? defaults?.methodName ?? "";
        return getActionButtonState({
          methods,
          table,
          params: { methodName, argName: value.argName, defaultValue: value },
          row: sourceRow,
          queryRow: row,
          stateKey: methodName,
          stored: { details: value.details },
        });
      }
      return getActionButtonState({
        methods,
        table,
        params: action,
        row: sourceRow,
        queryRow: row,
        stateKey,
      });
    },
  );
  const functionActions = actions.filter((state) => state && !state.stored);
  const hasEnabledActions = functionActions.some(
    (state) => !state?.buttonDisabledInfo,
  );
  return (
    <div className="flex-row ai-center gap-1" role="group" aria-label="Actions">
      {actions.map((state, index) => {
        if (
          state?.method?.jobControl &&
          actions.find((other) => other?.method === state.method) !== state
        )
          return null;
        return (
          <ActionButton
            key={index}
            state={state}
            table={table}
            hideButton={
              !!state &&
              !state.stored &&
              (hasEnabledActions ?
                !!state.buttonDisabledInfo
              : state !== functionActions[0])
            }
          />
        );
      })}
    </div>
  );
};
