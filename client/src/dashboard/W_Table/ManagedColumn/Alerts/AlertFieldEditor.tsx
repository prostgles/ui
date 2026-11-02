import type { AlertFieldName } from "@common/managedTableSchema";
import { FlexCol } from "@components/Flex";
import { FormFieldCodeEditor } from "@components/FormField/FormFieldCodeEditor";
import { JSONBSchemaA } from "@components/JSONBSchema/JSONBSchema";
import { SegmentedToggle } from "@components/SegmentedToggle";
import { mdiCodeJson, mdiFormSelect } from "@mdi/js";
import React, { useState } from "react";
import type { SmartFormFieldProps } from "../../../SmartForm/SmartFormField/SmartFormField";
import type { AsJSON } from "../../../SmartForm/SmartFormField/useSmartFormFieldAsJSON";
import { AlertDefinitionEditor } from "./AlertDefinitionEditor";
import { AlertFieldSummary } from "./AlertFieldSummary";
import { AlertRecipientsEditor } from "./AlertRecipientsEditor";
import { AlertScheduleEditor } from "./AlertScheduleEditor";

export const AlertFieldEditor = ({
  field,
  value,
  onChange,
  readOnly,
  column,
  db,
  tables,
  row,
  asJSON,
}: Pick<SmartFormFieldProps, "column" | "db" | "tables" | "row"> & {
  value: unknown;
  field: AlertFieldName;
  onChange: (value: any) => void;
  readOnly: boolean;
  asJSON: AsJSON | undefined;
}) => {
  const [mode, setMode] = useState<"form" | "json">("form");
  return (
    <FlexCol className="gap-p5 min-w-0 f-1">
      <SegmentedToggle
        className="as-start"
        value={mode}
        onChange={setMode}
        options={{
          form: { title: "Form", children: "Form", iconPath: mdiFormSelect },
          json: { title: "JSON", children: "JSON", iconPath: mdiCodeJson },
        }}
      />
      {mode === "json" ?
        <FormFieldCodeEditor
          asJSON={asJSON ?? { component: "codeEditor" }}
          value={JSON.stringify(value, null, 2)}
          onChange={onChange}
          readOnly={readOnly}
        />
      : readOnly ?
        <AlertFieldSummary field={field} value={value} />
      : field === "definition" ?
        <AlertDefinitionEditor
          value={value}
          onChange={onChange}
          tables={tables}
          isCallback={!!row?.config_key && value === null}
        />
      : field === "user_filter" ?
        <AlertRecipientsEditor value={value} onChange={onChange} />
      : field === "channels" && column.jsonbSchema ?
        <JSONBSchemaA
          schema={column.jsonbSchema}
          value={value}
          onChange={onChange}
          db={db}
          tables={tables}
        />
      : <AlertScheduleEditor value={value} onChange={onChange} />}
    </FlexCol>
  );
};
