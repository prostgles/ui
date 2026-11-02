import { getFunctionOptions } from "@common/functionOptions";
import { getActionFunctionArgs } from "@common/resolveActionFunction";
import Btn from "@components/Btn";
import { MarkdownWithPlugins } from "@components/MarkdownWithPlugins/MarkdownWithPlugins";
import Popup from "@components/Popup/Popup";
import { SvgIcon } from "@components/SvgIcon";
import { mdiInformationOutline } from "@mdi/js";
import type { ClientServerFunction, DBSchemaTable } from "prostgles-types";
import React, { useState } from "react";
import { ActionPopup } from "../../../ActionPopup/ActionPopup";
import { ActionColumnChats } from "./ActionColumnChats";
import type { getActionButtonState } from "./getActionButtonState";

export const ActionButton = (
  props:
    | { method: ClientServerFunction }
    | {
        state: ReturnType<typeof getActionButtonState>;
        table: DBSchemaTable;
        hideButton?: boolean;
      },
) => {
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const tableAction = "state" in props ? props : undefined;
  const state = tableAction?.state;
  if (tableAction && !state) return null;
  const method = "method" in props ? props.method : state?.method;
  const functionOptions = getFunctionOptions(method);
  const { action, row, queryRow, stored } = state ?? {};
  const values = state?.values ?? functionOptions?.action.defaultValue ?? {};
  const text = state?.text ?? functionOptions?.title ?? values.text ?? "Run";
  const matchesLookup = state?.matchesLookup ?? true;
  const record =
    action && row && queryRow && tableAction ?
      { row, queryRow, table: tableAction.table, argName: action.argName }
    : undefined;
  const runImmediately =
    state?.runImmediately ??
    (functionOptions?.action.runImmediately &&
      !method?.jobControl &&
      !Object.keys(method?.input ?? {}).length);
  return (
    <div
      className="flex-row ai-center gap-p5"
      onClick={(event) => event.stopPropagation()}
    >
      {matchesLookup && (
        <Btn
          size={tableAction ? "small" : undefined}
          color={values.color ?? "action"}
          variant={values.variant ?? "filled"}
          loading={values.isLoading ? "allow-clicking" : false}
          title={text}
          iconNode={
            values.icon ? <SvgIcon icon={values.icon} size={16} /> : undefined
          }
          disabledInfo={state ? state.buttonDisabledInfo : values.disabledInfo}
          style={tableAction?.hideButton ? { display: "none" } : undefined}
          onClickPromiseMode="noTickIcon"
          onClickPromise={async () => {
            if (!method || (tableAction && !record)) return;
            if (runImmediately) {
              await method.run(
                record ?
                  getActionFunctionArgs(
                    method,
                    record.argName,
                    record.row,
                    record.table,
                  )
                : undefined,
              );
            } else {
              setOpen(true);
            }
          }}
        >
          {state?.values.text ?? (values.icon ? undefined : text)}
        </Btn>
      )}
      {open && matchesLookup && method && (!tableAction || record) && (
        <ActionPopup
          key={action && `${action.methodName}:${action.argName}`}
          title={text}
          buttonText={state?.buttonText}
          disabledInfo={state?.disabledInfo ?? values.disabledInfo}
          details={stored?.details}
          method={method}
          record={record}
          onClose={() => setOpen(false)}
        />
      )}
      {stored && !method?.jobControl && (stored.details || row) && (
        <Btn
          size="small"
          iconPath={mdiInformationOutline}
          title="Action details"
          onClick={() => setShowDetails(true)}
        />
      )}
      {showDetails && stored && (
        <Popup title="Action details" onClose={() => setShowDetails(false)}>
          {stored.details && <MarkdownWithPlugins content={stored.details} />}
          {row && tableAction && (
            <ActionColumnChats
              row={row}
              table={tableAction.table}
              onOpen={() => setShowDetails(false)}
            />
          )}
        </Popup>
      )}
    </div>
  );
};
