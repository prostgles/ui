import React, { useCallback, useMemo } from "react";
import {
  CodeEditor,
  type CodeEditorProps,
} from "../../dashboard/CodeEditor/CodeEditor";
import type { AsJSON } from "../../dashboard/SmartForm/SmartFormField/useSmartFormFieldAsJSON";
import type { FormFieldProps } from "./FormField";
import { isObject } from "../../../../common/publishUtils";

type P = Pick<FormFieldProps, "value" | "onChange" | "readOnly"> & {
  className?: string;
  style?: React.CSSProperties;
  asJSON: AsJSON;
};

export const FormFieldCodeEditor = ({
  asJSON,
  value: valueAsStringOrObjectOrNull,
  onChange,
  className,
  style,
  readOnly,
}: P) => {
  const validatedSchemaId =
    asJSON.schemas?.length ? asJSON.schemas[0]!.id : undefined;

  const valueAsString = useMemo(() => {
    if (
      valueAsStringOrObjectOrNull &&
      (isObject(valueAsStringOrObjectOrNull) ||
        Array.isArray(valueAsStringOrObjectOrNull))
    ) {
      return JSON.stringify(valueAsStringOrObjectOrNull, null, 2);
    }
    if (typeof valueAsStringOrObjectOrNull === "string") {
      return valueAsStringOrObjectOrNull;
    }
    return "";
  }, [valueAsStringOrObjectOrNull]);

  const localOnChange = useCallback(
    (v: string) => {
      try {
        if (!onChange) return;
        const jsonValue = JSON.parse(v);
        onChange(jsonValue);
      } catch (e) {}
    },
    [onChange],
  );

  const editorProps = useMemo(
    () =>
      ({
        style: {
          minHeight: valueAsString.toString().length ? "100px" : "26px",
          minWidth: "200px",
          borderRadius: ".5em",
          flex: 1,
          resize: "vertical",
          overflow: "auto",
          border: "unset",
          borderRight: `1px solid var(--text-4)`,
          ...style,
        },
        options: {
          ...asJSON.options,
          tabSize: 2,
          minimap: {
            enabled: false,
          },
          lineNumbers: "off",
          automaticLayout: true,
        },
        language: {
          lang: "json",
          jsonSchemas: asJSON.schemas,
        },
      }) satisfies Pick<CodeEditorProps, "options" | "language" | "style">,
    [valueAsString, asJSON.schemas, asJSON.options, style],
  );

  return (
    <CodeEditor
      key={validatedSchemaId}
      className={className}
      {...editorProps}
      value={valueAsString}
      onChange={readOnly || !onChange ? undefined : localOnChange}
    />
  );
};
