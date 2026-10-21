import type { ActionColumnsParams } from "@common/actionColumn";
import type { AnyObject, DBSchemaTable } from "prostgles-types";
import React from "react";
import { ActionButton } from "./ActionButton";
import { ActionColumnButton } from "./ActionColumnButton";

export const ActionColumns = ({
  params,
  row,
  dataKey,
  table,
}: {
  params: ActionColumnsParams;
  row: AnyObject;
  dataKey: string;
  table: DBSchemaTable;
}) => {
  const sourceRow = row[dataKey] as AnyObject | undefined;
  return (
    <div className="flex-row ai-center gap-1" role="group" aria-label="Actions">
      {params.actions.map((action, index) => {
        if ("columnName" in action) {
          const column = table.columns.find(
            (c) => c.name === action.columnName && c.select,
          );
          if (!column) return null;
          const defaults = column.jsonbSchema?.defaultValue;
          const methodName =
            (
              defaults &&
              typeof defaults === "object" &&
              "methodName" in defaults &&
              typeof defaults.methodName === "string"
            ) ?
              defaults.methodName
            : undefined;
          return (
            <ActionColumnButton
              key={index}
              value={sourceRow?.[action.columnName]}
              row={sourceRow}
              queryRow={row}
              table={table}
              methodName={methodName}
            />
          );
        }
        const columnName = `${dataKey}_${index}`;
        const actionRow = { ...row, [columnName]: sourceRow };
        return (
          <ActionButton
            key={index}
            format={{ type: "Action", params: action }}
            row={actionRow}
            columnName={columnName}
            table={table}
          />
        );
      })}
    </div>
  );
};
