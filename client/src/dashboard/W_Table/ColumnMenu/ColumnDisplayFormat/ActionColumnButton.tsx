import type { ActionColumnValue } from "@common/createActionColumn";
import Btn from "@components/Btn";
import { MarkdownWithPlugins } from "@components/MarkdownWithPlugins/MarkdownWithPlugins";
import Popup from "@components/Popup/Popup";
import { SvgIcon } from "@components/SvgIcon";
import { mdiInformationOutline } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { AnyObject, DBSchemaTable } from "prostgles-types";
import { ROW_ACTIONS_COLUMN } from "prostgles-client";
import React, { useState } from "react";
import {
  getActionLookupRow,
  resolveActionFunction,
} from "@common/resolveActionFunction";
import { ActionColumnChats } from "./ActionColumnChats";
import { getFunctionActionValue } from "@common/functionOptions";

export const ActionColumnButton = ({
  value,
  row,
  queryRow,
  table,
  methodName: fallbackMethod,
}: {
  value: ActionColumnValue | null;
  row: AnyObject | undefined;
  queryRow: AnyObject;
  table: DBSchemaTable;
  methodName?: string;
}) => {
  const { methods } = usePrgl();
  const [showDetails, setShowDetails] = useState(false);
  if (!value) return null;
  const methodName = value.methodName ?? fallbackMethod;
  const method = methodName ? methods[methodName] : undefined;
  const buttonValue = {
    text: methodName,
    ...getFunctionActionValue(method, queryRow, methodName ?? "", value),
  };
  const { action, error } = resolveActionFunction(
    methods,
    table,
    { ...value, methodName },
    true,
  );
  const allowedActions = queryRow[ROW_ACTIONS_COLUMN] as string[] | undefined;
  const matchesLookup = !action || allowedActions?.includes(action.methodName);
  const disabledInfo =
    buttonValue.disabledInfo ||
    (error ? error
    : !row ? "Actions require an individual row"
    : undefined);
  return (
    <div
      className="flex-row ai-center gap-p5"
      onClick={(e) => e.stopPropagation()}
    >
      {matchesLookup && (
        <Btn
          key={methodName}
          size="small"
          color={buttonValue.color ?? "action"}
          variant={buttonValue.variant ?? "filled"}
          loading={buttonValue.isLoading ? "allow-clicking" : false}
          title={buttonValue.text || methodName}
          iconNode={
            buttonValue.icon ?
              <SvgIcon icon={buttonValue.icon} size={16} />
            : undefined
          }
          disabledInfo={disabledInfo}
          onClickPromiseMode="noTickIcon"
          onClickPromise={async () => {
            if (!action || !method || !row || disabledInfo) return;
            const arg = method.input?.[action.argName];
            const input =
              arg && typeof arg !== "string" && arg.type === "ValueLookup" ?
                row[arg.column]
              : getActionLookupRow(row, table, method);
            await method.run({ [action.argName]: input });
          }}
        >
          {buttonValue.text}
        </Btn>
      )}
      {(value.details || row) && (
        <Btn
          size="small"
          iconPath={mdiInformationOutline}
          title="Action details"
          onClick={() => setShowDetails(true)}
        />
      )}
      {showDetails && (
        <Popup title="Action details" onClose={() => setShowDetails(false)}>
          {value.details && <MarkdownWithPlugins content={value.details} />}
          {row && (
            <ActionColumnChats
              row={row}
              table={table}
              onOpen={() => setShowDetails(false)}
            />
          )}
        </Popup>
      )}
    </div>
  );
};
