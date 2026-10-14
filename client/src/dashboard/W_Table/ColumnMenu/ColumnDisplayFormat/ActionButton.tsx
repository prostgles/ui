import {
  getActionValueKey,
  type ActionButtonState,
} from "@common/actionColumn";
import Btn from "@components/Btn";
import { SvgIcon } from "@components/SvgIcon";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { AnyObject, DBSchemaTable } from "prostgles-types";
import { ROW_ACTIONS_COLUMN } from "prostgles-client";
import React, { useState } from "react";
import { ActionPopup } from "../../../ActionPopup/ActionPopup";
import type { ActionFormat } from "./ActionFormatControls";
import { resolveActionFunction } from "@common/resolveActionFunction";
import { getFunctionActionValue } from "@common/functionOptions";

export const ActionButton = ({
  format: { params },
  row,
  columnName,
  table,
}: {
  format: ActionFormat;
  row: AnyObject;
  columnName: string;
  table: DBSchemaTable;
}) => {
  const { methods } = usePrgl();
  const method = methods[params.methodName];
  const [open, setOpen] = useState(false);
  const { action, error } = resolveActionFunction(methods, table, params);
  const sourceRow = row[columnName] as AnyObject | undefined;
  const allowedActions = row[ROW_ACTIONS_COLUMN] as string[] | undefined;
  if (action && !allowedActions?.includes(action.methodName)) return null;
  const stateValue = row[getActionValueKey(columnName)] as string | undefined;
  const values = getFunctionActionValue(method, row, columnName, {
    ...params.defaultValue,
    ...(stateValue ? (JSON.parse(stateValue) as ActionButtonState) : {}),
  });
  return (
    <>
      <Btn
        size="small"
        color={values.color ?? "action"}
        variant={values.variant ?? "filled"}
        loading={values.isLoading ? "allow-clicking" : false}
        title={values.text || params.methodName}
        iconNode={
          values.icon ? <SvgIcon icon={values.icon} size={16} /> : undefined
        }
        disabledInfo={
          error ? error
          : !sourceRow ?
            "Actions require an individual row"
          : values.disabledInfo || undefined
        }
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {values.text ?? (values.icon ? undefined : params.methodName)}
      </Btn>
      {open && action && sourceRow && method && (
        <ActionPopup
          title={values.text || params.methodName}
          method={method}
          row={sourceRow}
          table={table}
          argName={action.argName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};
