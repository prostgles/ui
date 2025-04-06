import {
  getJSONBSchemaAsJSONSchema,
  isEmpty,
  isObject,
  type JSONB,
} from "prostgles-types";
import type {
  CodeEditorJsonSchema,
  CodeEditorProps,
} from "../../CodeEditor/CodeEditor";
import type { SmartFormFieldProps } from "./SmartFormField";
import { useMemo } from "react";

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
      jsonbSchema?: JSONB.JSONBSchema<JSONB.FieldTypeObj>;
    }
  | {
      component: "JSONBSchema";
      jsonbSchema: JSONB.JSONBSchema<JSONB.FieldTypeObj>;
      noLabels: boolean;
    }
);

/**
 * Given a column, if it is:
 * - JSONB with a CHECK schema
 * or
 * - geography type
 * then render it using JSONBSchemaA or CodeEditor
 */
export const useSmartFormFieldAsJSON = ({
  column,
  tableName,
  jsonbSchemaWithControls,
  value,
}: P): AsJSON | undefined => {
  const valueIsNonEmptyObject = useMemo(
    () => isObject(value) && !isEmpty(value),
    [value],
  );

  return useMemo(() => {
    /** When a function was passed to the geo data (ST_...) */
    if (column.udt_name === "geography" && valueIsNonEmptyObject) {
      return {
        component: "codeEditor",
        options: {
          // value: JSON.stringify(value, null, 2),
        },
      };
    }

    if (column.udt_name.startsWith("json") && tableName) {
      if (jsonbSchemaWithControls && column.jsonbSchema) {
        const noLabels =
          isObject(jsonbSchemaWithControls) &&
          jsonbSchemaWithControls.variant === "no-labels";

        return {
          component: "JSONBSchema",
          jsonbSchema: column.jsonbSchema,
          noLabels,
        };
      }
      const jsonSchema =
        column.jsonbSchema &&
        getJSONBSchemaAsJSONSchema(tableName, column.name, column.jsonbSchema);
      return {
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
        component: "codeEditor",
      };
    }
  }, [column, tableName, jsonbSchemaWithControls, valueIsNonEmptyObject]);
};

// const setTitleToEmpty = <
//   S extends JSONB.FieldType | JSONB.JSONBSchema<JSONB.FieldTypeObj> | undefined,
// >(
//   jsonbSchema: S,
// ): S => {
//   if (
//     !jsonbSchema ||
//     typeof jsonbSchema === "string" ||
//     !isObject(jsonbSchema)
//   ) {
//     return jsonbSchema;
//   }

//   const withNested = (s: JSONB.JSONBSchema<JSONB.FieldTypeObj>) => {
//     if (s.oneOf) {
//       return Object.assign({}, s, {
//         oneOf: s.oneOf.map(setTitleToEmpty),
//       });
//     } else if (s.oneOfType) {
//       return Object.assign({}, s, {
//         oneOfType: s.oneOfType.map((ot) => {
//           const { type } = setTitleToEmpty({ type: ot });
//           return type;
//         }),
//       });
//     } else if (s.arrayOfType) {
//       return Object.assign({}, s, {
//         arrayOfType: setTitleToEmpty(s.arrayOfType),
//       });
//     } else if (isObject(s.type)) {
//       return Object.assign({}, s, {
//         type: Object.entries(s.type).reduce((acc, [k, v]) => {
//           const withoutTitle = setTitleToEmpty(v);
//           acc[k] = withoutTitle;
//           return acc;
//         }, {} as JSONB.JSONBSchema<JSONB.FieldTypeObj>),
//       });
//     }
//     return s;
//   };

//   const res = withNested(jsonbSchema);
//   return Object.assign({}, res, {
//     title: "",
//   }) as S;
// };
