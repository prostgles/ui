import type { UserColumnFormat } from "@common/columnDisplayFormat.schema";
import Btn from "@components/Btn";
import { Select } from "@components/Select/Select";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React from "react";
import type { DBSchemaTable } from "prostgles-types";
import { ActionFormatControls } from "./ActionFormatControls";
import { getActionFunctions } from "./getActionFunctions";

export type ActionColumnsFormat = Extract<UserColumnFormat, { type: "ActionColumns" }>;

export const ActionColumnsControls = ({ table, value, onChange }: {
  table: DBSchemaTable;
  value: ActionColumnsFormat;
  onChange: (value: ActionColumnsFormat) => void;
}) => {
  const { methods, tables } = usePrgl();
  const { actions } = value.params;
  const columns = (tables.find((t) => t.name === table.name)?.columns ?? []).filter((c) => c.select &&
    c.defaultRenderAs?.params.component === "ActionColumns");
  const functions = getActionFunctions(methods, table);
  const update = (actions: ActionColumnsFormat["params"]["actions"]) =>
    onChange({ type: "ActionColumns", params: { actions } });
  return (
    <div className="flex-col gap-1">
      {actions.map((action, index) => (
        <div key={index} className="flex-col gap-p5">
          {"columnName" in action ? <div>{action.columnName}</div> :
            <ActionFormatControls table={table} value={{ type: "Action", params: action }}
              onChange={({ params }) => update(actions.map((a, i) => i === index ? params : a))} />}
          <Btn onClick={() => update(actions.filter((_, i) => i !== index))}>Remove action</Btn>
        </div>
      ))}
      <Select label="Add action" value={undefined}
        fullOptions={[
          ...columns.filter((c) => !actions.some((a) => "columnName" in a && a.columnName === c.name))
            .map((c) => ({ key: `column:${c.name}`, label: c.label || c.name })),
          ...functions.map((f, index) => ({ key: `function:${index}`, label: `${f.methodName} (${f.argName})` })),
        ]}
        onChange={(key) => {
          if (key.startsWith("column:")) {
            update([...actions, { columnName: key.slice("column:".length) }]);
          } else {
            const action = functions[Number(key.slice("function:".length))];
            if (action) update([...actions, { ...action,
              conditions: [],
              defaultValue: { text: action.methodName },
            }]);
          }
        }} />
    </div>
  );
};
