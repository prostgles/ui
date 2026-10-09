import { getActionValueKey, type ActionButtonState } from "@common/actionColumn";
import Btn from "@components/Btn";
import Popup from "@components/Popup/Popup";
import { SvgIcon } from "@components/SvgIcon";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { AnyObject, DBSchemaTable } from "prostgles-types";
import { ROW_ACTIONS_COLUMN } from "prostgles-client";
import React, { useState } from "react";
import { W_MethodControls } from "../../../W_Method/W_MethodControls";
import type { ActionFormat } from "./ActionFormatControls";
import { getActionFunctions } from "./getActionFunctions";

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
  const { db, methods, tables } = usePrgl();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<{ args?: AnyObject }>({});
  const action = getActionFunctions(methods, table).find(
    (a) => a.methodName === params.methodName && a.argName === params.argName,
  );
  const sourceRow = row[columnName] as AnyObject | undefined;
  const allowedActions = row[ROW_ACTIONS_COLUMN] as string[] | undefined;
  if (action && !allowedActions?.includes(action.methodName)) return null;
  const stateValue = row[getActionValueKey(columnName)] as string | undefined;
  const values: ActionButtonState = stateValue ? JSON.parse(stateValue) : params.defaultValue ?? {};
  return (
    <>
      <Btn
        size="small"
        color={values.color ?? "action"}
        variant={values.variant ?? "filled"}
        loading={values.isLoading === true}
        title={values.text || params.methodName}
        iconNode={
          values.icon ? <SvgIcon icon={values.icon} size={16} /> : undefined
        }
        disabledInfo={
          !action ? "This function lookup is no longer available"
          : !sourceRow ?
            "Actions require an individual row"
          : values.disabledInfo || undefined
        }
        onClick={(e) => {
          e.stopPropagation();
          setState({});
          setOpen(true);
        }}
      >
        {values.text}
      </Btn>
      {open && action && sourceRow && (
        <Popup
          title={params.methodName}
          onClose={() => setOpen(false)}
          showFullscreenToggle={{ defaultValue: true }}
        >
          <W_MethodControls
            db={db}
            methods={methods}
            tables={tables}
            method_name={params.methodName}
            fixedRowArgument={{
              row: sourceRow,
              argName: params.argName,
              tableName: table.name,
            }}
            state={state}
            setState={setState}
            w={undefined}
          />
        </Popup>
      )}
    </>
  );
};
