import { ActionCaseControls } from "./ActionCaseControls";
import type { UserColumnFormat } from "@common/columnDisplayFormat.schema";
import { FlexCol } from "@components/Flex";
import { Select } from "@components/Select/Select";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { DBSchemaTable } from "prostgles-types";
import React from "react";
import { getRowActionFunctions } from "../../../ActionPopup/getJobActionFunctions";
import { resolveActionFunction } from "@common/resolveActionFunction";
import { getFunctionOptions } from "@common/functionOptions";
import { SwitchToggle } from "@components/SwitchToggle";

export type ActionFormat = Extract<UserColumnFormat, { type: "Action" }>;

export const ActionFormatControls = ({
  table,
  value,
  onChange,
}: {
  table: DBSchemaTable;
  value: ActionFormat;
  onChange: (format: ActionFormat) => void;
}) => {
  const { methods } = usePrgl();
  const actions = getRowActionFunctions(methods, table);
  const { params } = value;
  const { action, method, hasAdditionalInputs } = resolveActionFunction(
    methods,
    table,
    params,
  );
  const update = (patch: Partial<ActionFormat["params"]>) =>
    onChange({ type: "Action", params: { ...params, ...patch } });
  return (
    <FlexCol>
      <Select
        data-command="ActionFormat.function"
        label="Function"
        value={JSON.stringify([
          params.methodName,
          action?.argName ?? params.argName,
        ])}
        fullOptions={actions.map(({ methodName, argName }) => ({
          key: JSON.stringify([methodName, argName]),
          label: `${methodName} (${argName})`,
        }))}
        onChange={(key) => {
          const action = actions.find(
            (a) => JSON.stringify([a.methodName, a.argName]) === key,
          );
          if (action) {
            update({ methodName: action.methodName, argName: action.argName });
          }
        }}
      />
      <SwitchToggle
        label="Run without a popup"
        checked={
          params.runImmediately ??
          getFunctionOptions(method)?.action.runImmediately ??
          false
        }
        disabledInfo={
          method?.jobControl ? "Job buttons open their details"
          : hasAdditionalInputs ?
            "This function has additional inputs"
          : !action ?
            "Select a function"
          : undefined
        }
        onChange={(runImmediately) => update({ runImmediately })}
      />
      <ActionCaseControls table={table} value={params} onChange={update} />
    </FlexCol>
  );
};
