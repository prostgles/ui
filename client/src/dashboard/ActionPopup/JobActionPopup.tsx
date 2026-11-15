import type { DBSchemaTable, AnyObject } from "prostgles-types";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React from "react";
import { useSubscribeOrFind } from "../../hooks/useSubscribeOrFind";
import { getActionButtonState } from "../W_Table/ColumnMenu/ColumnDisplayFormat/getActionButtonState";
import { getFormatColumnSelect } from "../W_Table/ColumnMenu/ColumnDisplayFormat/getFormatColumnSelect";
import { getTableRowIdentityColumns } from "../W_Table/ColumnMenu/ColumnDisplayFormat/getTableIdentityColumns";
import { ActionPopup } from "./ActionPopup";

export const JobActionPopup = ({
  state,
  table,
  anchorXY,
  onClose,
}: JobActionPopupProps) => {
  const { db, methods, tables } = usePrgl();
  const tableInfo = tables.find(({ name }) => name === table.name);
  const identityColumns =
    tableInfo ?
      getTableRowIdentityColumns(
        tableInfo,
        tableInfo.columns.map(({ name }) => ({
          name,
          show: state.row?.[name] != null,
        })),
      )
    : [];
  const filter = Object.fromEntries(
    identityColumns.map(({ name }) => [name, state.row?.[name]]),
  );
  const { data, error } = useSubscribeOrFind(
    db[table.name],
    filter,
    {
      select:
        tableInfo ?
          getFormatColumnSelect({
            column: {
              name: state.stateKey,
              format: { type: "Action", params: state.params },
            },
            table: tableInfo,
            tables,
            methods,
          })
        : {},
      limit: 1,
    },
    { skip: !identityColumns.length },
  );
  const queryRow = data?.[0] ?? state.queryRow;
  const row = (queryRow[state.stateKey] as AnyObject | undefined) ?? state.row;
  const currentState =
    getActionButtonState({
      ...state,
      methods,
      table,
      row,
      queryRow,
    }) ?? state;
  if (!state.method) return null;
  return (
    <ActionPopup
      anchorXY={anchorXY}
      title={state.actionName}
      buttonText={currentState.buttonText}
      disabledInfo={currentState.disabledInfo}
      details={state.stored?.details}
      method={state.method}
      record={
        state.action && row ?
          { row, queryRow, table, argName: state.action.argName }
        : undefined
      }
      error={error}
      onClose={onClose}
    />
  );
};

export type JobActionPopupProps = {
  state: NonNullable<ReturnType<typeof getActionButtonState>>;
  table: DBSchemaTable;
  anchorXY: { x: number; y: number };
  onClose: VoidFunction;
};
