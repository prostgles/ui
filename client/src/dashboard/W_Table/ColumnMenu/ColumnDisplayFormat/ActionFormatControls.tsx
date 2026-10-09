import { ActionCaseControls } from "./ActionCaseControls";
import type { UserColumnFormat } from "@common/columnDisplayFormat.schema";
import { FlexCol } from "@components/Flex";
import { Select } from "@components/Select/Select";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { DBSchemaTable } from "prostgles-types";
import React from "react";
import { getActionFunctions } from "./getActionFunctions";

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
  const actions = getActionFunctions(methods, table);
  const { params } = value;
  const update = (patch: Partial<ActionFormat["params"]>) =>
    onChange({ type: "Action", params: { ...params, ...patch } });
  return (
    <FlexCol>
      <Select
        data-command="ActionFormat.function"
        label="Function"
        value={JSON.stringify([params.methodName, params.argName])}
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
      <ActionCaseControls table={table} value={params} onChange={update} />
    </FlexCol>
  );
};
