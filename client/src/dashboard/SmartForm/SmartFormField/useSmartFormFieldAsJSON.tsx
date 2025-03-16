import React from "react";
import type { FormFieldProps } from "../../../components/FormField/FormField";
import { JSONBSchemaA } from "../../../components/JSONBSchema/JSONBSchema";
import type { SmartFormFieldProps } from "./SmartFormField";
import { getJSONBSchemaAsJSONSchema, isEmpty, isObject } from "prostgles-types";

type P = Pick<
  SmartFormFieldProps,
  "column" | "tableName" | "jsonbSchemaWithControls" | "db" | "tables" | "value"
> & {
  onCheckAndChange: (newValue: any) => void;
};

export const useSmartFormFieldAsJSON = ({
  column,
  tableName,
  jsonbSchemaWithControls,
  db,
  tables,
  value,
  onCheckAndChange,
}: P) => {
  let asJSON: FormFieldProps["asJSON"];
  if (column.udt_name.startsWith("json") && tableName) {
    if (jsonbSchemaWithControls && column.jsonbSchema) {
      const content = (
        <JSONBSchemaA
          db={db}
          schema={column.jsonbSchema}
          tables={tables}
          value={value}
          onChange={onCheckAndChange}
        />
      );
      return {
        type: "component" as const,
        content,
      };
    }
    const jsonSchema =
      column.jsonbSchema &&
      getJSONBSchemaAsJSONSchema(tableName, column.name, column.jsonbSchema);
    asJSON = {
      options: {
        // value:
        //   (typeof value !== "string" && value ?
        //     JSON.stringify(value, null, 2)
        //   : value?.toString()) ?? "",
      },
      ...(column.jsonbSchema && {
        schemas: [
          {
            id: `${tableName}_${column.name}`,
            schema: jsonSchema,
          },
        ],
      }),
    };
  }
  if (column.udt_name === "geography" && isObject(value) && !isEmpty(value)) {
    asJSON = {
      options: {
        // value: JSON.stringify(value, null, 2),
      },
    };
  }

  return {
    type: "props" as const,
    asJSON,
  };
};
