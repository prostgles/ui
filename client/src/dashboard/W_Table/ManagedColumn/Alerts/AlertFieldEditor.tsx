import type { AlertFieldName } from "@common/managedTableSchema";
import { FlexCol } from "@components/Flex";
import { FormFieldCodeEditor } from "@components/FormField/FormFieldCodeEditor";
import { JSONBSchemaLookupMatch } from "@components/JSONBSchema/JSONBSchemaLookup";
import React from "react";
import type { SmartFormFieldProps } from "../../../SmartForm/SmartFormField/SmartFormField";
import type { AsJSON } from "../../../SmartForm/SmartFormField/useSmartFormFieldAsJSON";
import { AlertChannelsEditor } from "./AlertChannelsEditor";
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
  mode,
}: Pick<SmartFormFieldProps, "column" | "db" | "tables" | "row"> & {
  value: unknown;
  field: AlertFieldName;
  onChange: (value: any) => void;
  readOnly: boolean;
  asJSON: AsJSON | undefined;
  mode: "form" | "json";
}) => {
  return (
    <FlexCol className="gap-p5 min-w-0 f-1">
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
      : (
        field === "channels" &&
        column.jsonbSchema &&
        JSONBSchemaLookupMatch(column.jsonbSchema) &&
        column.jsonbSchema.type === "ValueLookup[]"
      ) ?
        <AlertChannelsEditor
          schema={column.jsonbSchema}
          value={value}
          onChange={onChange}
          db={db}
        />
      : <AlertScheduleEditor value={value} onChange={onChange} />}
    </FlexCol>
  );
};
