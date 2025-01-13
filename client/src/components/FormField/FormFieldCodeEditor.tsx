import React, { useCallback } from "react";
import type { FormFieldProps } from "./FormField";
import { CodeEditor } from "../../dashboard/CodeEditor/CodeEditor";

type P = Pick<
  FormFieldProps,
  "value" | "disabledInfo" | "onChange" | "readOnly"
> & {
  className?: string;
  style?: React.CSSProperties;
  asJSON: NonNullable<FormFieldProps["asJSON"]>;
};
export const FormFieldCodeEditor = ({
  asJSON,
  value,
  disabledInfo,
  onChange,
  className,
  style,
  readOnly,
}: P) => {
  const localOnChange = useCallback(
    (v) => {
      try {
        if (!onChange) return;
        const jsonValue = JSON.parse(v);
        onChange(jsonValue);
      } catch (e) {}
    },
    [onChange],
  );

  return (
    <CodeEditor
      key={asJSON.schemas?.length ? asJSON.schemas[0]!.id : undefined}
      className={className}
      style={{
        minHeight: value?.toString().length ? "100px" : "26px",
        minWidth: "200px",
        borderRadius: ".5em",
        flex: 1,
        resize: "vertical",
        overflow: "auto",
        border: "unset",
        borderRight: `1px solid var(--text-4)`,
        ...style,
      }}
      options={{
        ...asJSON.options,
        tabSize: 2,
        minimap: {
          enabled: false,
        },
        lineNumbers: "off",
        automaticLayout: true,
      }}
      value={value}
      language={{
        lang: "json",
        jsonSchemas: asJSON.schemas,
      }}
      onChange={
        readOnly || disabledInfo || !onChange ? undefined : localOnChange
      }
    />
  );
};
