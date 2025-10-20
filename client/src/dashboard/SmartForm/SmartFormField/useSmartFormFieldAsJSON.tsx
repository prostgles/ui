import {
  getJSONBSchemaAsJSONSchema,
  isEmpty,
  isObject,
  type JSONB,
} from "prostgles-types";
import { useMemo } from "react";
import type {
  CodeEditorJsonSchema,
  CodeEditorProps,
} from "../../CodeEditor/CodeEditor";
import type { SmartFormFieldProps } from "./SmartFormField";

type P = Pick<
  SmartFormFieldProps,
  "column" | "tableName" | "jsonbSchemaWithControls" | "value"
>;

export type AsJSON = {
  schemas?: CodeEditorJsonSchema[];
  options?: Omit<CodeEditorProps, "language" | "value">;
} & (
  | {
      component: "codeEditor";
      jsonbSchema?: JSONB.JSONBSchema;
    }
  | {
      component: "JSONBSchema";
      jsonbSchema: JSONB.JSONBSchema;
      opts: Exclude<SmartFormFieldProps["jsonbSchemaWithControls"], boolean>;
    }
);

/**
 * Given a column, if it is:
 * - JSONB with a CHECK schema
 * or
 * - geography type
 * then render it using JSONBSchemaA or CodeEditor
 */
export const useSmartFormFieldAsJSON = (props: P): AsJSON | undefined => {
  const { column, tableName, jsonbSchemaWithControls, value } = props;
  const valueIsNonEmptyObject = useMemo(
    () => isObject(value) && !isEmpty(value),
    [value],
  );

  return useMemo(() => {
    /** When a function was passed to the geo data (ST_...) */
    if (column.udt_name === "geography" && valueIsNonEmptyObject) {
      return {
        component: "codeEditor",
        options: {},
      };
    }

    if (column.udt_name.startsWith("json") && tableName) {
      if (jsonbSchemaWithControls && column.jsonbSchema) {
        const opts =
          isObject(jsonbSchemaWithControls) ?
            jsonbSchemaWithControls
          : undefined;

        return {
          component: "JSONBSchema",
          jsonbSchema: column.jsonbSchema,
          opts,
        };
      }
      const jsonSchema =
        column.jsonbSchema &&
        getJSONBSchemaAsJSONSchema(tableName, column.name, column.jsonbSchema);
      return {
        options: {},
        ...(column.jsonbSchema && {
          schemas: [
            {
              id: `${tableName}_${column.name}`,
              schema: jsonSchema,
            },
          ],
        }),
        component: "codeEditor",
      };
    }
  }, [column, tableName, jsonbSchemaWithControls, valueIsNonEmptyObject]);
};
