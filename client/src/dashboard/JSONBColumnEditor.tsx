import React from "react";
import type { ValidatedColumnInfo } from "prostgles-types";
import { getJSONBSchemaAsJSONSchema } from "prostgles-types";
import type { CodeEditorProps } from "./CodeEditor/CodeEditor";
import { CodeEditor } from "./CodeEditor/CodeEditor";
import { appTheme, useReactiveState } from "../App";
import ErrorComponent from "../components/ErrorComponent";

type P = {
  style?: React.CSSProperties;
  className?: string;
  value: any;
  tableName: string;
  column: ValidatedColumnInfo;
  onChange: (v: any) => void;
};
export const JSONBColumnEditor = ({
  value,
  column,
  tableName,
  onChange,
  style,
  className,
}: P) => {
  if (!column.jsonbSchema) {
    return (
      <ErrorComponent error={"Provided column is not of jsonbSchema type"} />
    );
  }

  const jsonSchema = getJSONBSchemaAsJSONSchema(
    tableName,
    column.name,
    column.jsonbSchema,
  );
  const codeEditorProps: CodeEditorProps = {
    style,
    className,
    language: {
      lang: "json",
      jsonSchemas: [
        {
          id: `${tableName}_${column.name}`,
          schema: jsonSchema,
        },
      ],
    },
    value:
      (typeof value !== "string" && value ?
        JSON.stringify(value, null, 2)
      : value?.toString()) ?? "",
  };

  return (
    <CodeEditor
      {...codeEditorProps}
      style={{ minWidth: "500px", flex: 1 }}
      onChange={onChange}
    />
  );
};
