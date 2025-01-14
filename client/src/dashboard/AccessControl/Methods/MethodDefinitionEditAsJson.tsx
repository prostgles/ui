import { getJSONBSchemaAsJSONSchema } from "prostgles-types";
import React, { useCallback, useMemo } from "react";
import { CodeEditor, type LanguageConfig } from "../../CodeEditor/CodeEditor";
import type { MethodDefinitionProps } from "./MethodDefinition";

export const MethodDefinitionEditAsJson = (props: MethodDefinitionProps) => {
  const { onChange, method, dbsTables } = props;

  const { language, methodArgsCol } = useMemo(() => {
    const methodsTable = dbsTables.find((t) => t.name === "published_methods");
    const methodArgsCol = methodsTable?.columns.find(
      (c) => c.name === "arguments",
    );
    const jsonSchema = getJSONBSchemaAsJSONSchema(
      "published_methods",
      "arguments",
      {
        type: {
          ...methodsTable?.columns
            // .filter((c) => ["arguments"].includes(c.name))
            .filter((c) => !["id"].includes(c.name))
            .reduce(
              (a, v) => ({
                ...a,
                [v.name]: { type: v.tsDataType, nullable: v.is_nullable },
              }),
              {},
            ),
          arguments: methodArgsCol?.jsonbSchema as any,
        },
      },
    );
    const jsonSchemas = [
      {
        id: "published_methods",
        schema: jsonSchema,
      },
    ];
    const language: LanguageConfig = {
      lang: "json",
      jsonSchemas,
    };

    return {
      language,
      methodArgsCol,
    };
  }, [dbsTables]);

  const onCodeChange = useCallback(
    (val: string) => {
      try {
        const newMethod = JSON.parse(val);
        onChange(newMethod);
      } catch (err) {
        // console.error(err);
      }
    },
    [onChange],
  );

  return (
    <CodeEditor
      style={{
        minWidth: "600px",
        minHeight: "400px",
      }}
      language={language}
      value={JSON.stringify(method, null, 2)}
      onChange={onCodeChange}
    />
  );
};
