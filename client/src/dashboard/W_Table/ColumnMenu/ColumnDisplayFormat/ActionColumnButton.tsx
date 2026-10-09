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
import { getActionFunctions } from "./getActionFunctions";
import { ActionColumnChats } from "./ActionColumnChats";

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
  const matches = getActionFunctions(methods, table).filter(
    (action) =>
      action.methodName === methodName &&
      (!value.argName || action.argName === value.argName),
  );
  const action = matches.length === 1 ? matches[0] : undefined;
  const allowedActions = queryRow[ROW_ACTIONS_COLUMN] as string[] | undefined;
  const matchesLookup = !action || allowedActions?.includes(action.methodName);
  const disabledInfo =
    value.disabledInfo ||
    (!methodName ? "No action available"
    : !method ? "This function is no longer available"
    : !action ? "This function needs one matching row or value lookup argument"
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
          color={value.color ?? "action"}
          variant={value.variant ?? "filled"}
          loading={value.isLoading ? "allow-clicking" : false}
          title={value.text || methodName}
          iconNode={
            value.icon ? <SvgIcon icon={value.icon} size={16} /> : undefined
          }
          disabledInfo={disabledInfo}
          onClickPromiseMode="noTickIcon"
          onClickPromise={async () => {
            if (!action || !method || !row || disabledInfo) return;
            const arg = method.input?.[action.argName];
            const input =
              arg && typeof arg !== "string" && arg.type === "ValueLookup" ?
                row[arg.column]
              : Object.fromEntries(
                  Object.entries(row).filter(
                    ([key, value]) =>
                      table.columns.some((c) => c.name === key && c.filter) &&
                      (value === null ||
                        ["string", "number", "boolean"].includes(typeof value)),
                  ),
                );
            await method.run({ [action.argName]: input });
          }}
        >
          {value.text}
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
