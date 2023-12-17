import React from "react";
import { ValidatedColumnInfo, getJSONBSchemaAsJSONSchema } from "prostgles-types";
import CodeEditor, { CodeEditorProps } from "./CodeEditor";
import { useReactiveState } from "./ProstglesMethod/hooks";
import { themeR } from "../App";
import ErrorComponent from "../components/ErrorComponent";

type P = {
  style?: React.CSSProperties;
  className?: string;
  value: any;
  tableName: string;
  column: ValidatedColumnInfo;
  onChange: (v: any) => void;
}
export const JSONBColumnEditor = ({ value, column, tableName, onChange, style, className }: P) => {

  const { state: theme } = useReactiveState(themeR);
  if (!column.jsonbSchema) {
    return <ErrorComponent error={"Provided column is not of jsonbSchema type"} />
  }

  const jsonSchema = column.jsonbSchema && getJSONBSchemaAsJSONSchema(tableName, column.name, column.jsonbSchema);
  const codeEditorProps: CodeEditorProps = {
    style, 
    className,
    language: "json",
    options: {
      theme: `vs-${theme}`
    },
    value: (typeof value !== "string" && value ? JSON.stringify(value, null, 2) : value?.toString()) ?? "",
    ...(column.jsonbSchema && {
      jsonSchemas: [{
        id: `${tableName}_${column.name}`,
        schema: jsonSchema
      }]
    })
  }

  return <CodeEditor 
    {...codeEditorProps}
    style={{ minWidth: "500px", flex: 1 }}
    onChange={onChange}
  />
}