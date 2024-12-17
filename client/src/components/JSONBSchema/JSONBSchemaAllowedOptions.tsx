import type { JSONB } from "prostgles-types";
import { isObject } from "prostgles-types";
import React from "react";
import FormField from "../FormField/FormField";
import type { FullOption } from "../Select/Select";
import { isCompleteJSONB } from "./isCompleteJSONB";
import type { JSONBSchemaCommonProps } from "./JSONBSchema";

type Schema = JSONB.BasicType;
type P = JSONBSchemaCommonProps & {
  schema: Schema;
  onChange: (newValue: JSONB.GetType<Schema>) => void;
};
/**
 * To construct a fullOptions select use this schema:
 * {
 *    oneOf: [
 *      { enum: ["key"], description: "subLabel" }
 *    ]
 * }
 */
const getFullOptions = (
  s: JSONB.JSONBSchema,
): { fullOptions: FullOption[]; isMulti: boolean } | undefined => {
  if (s.allowedValues) {
    return {
      fullOptions: s.allowedValues.map((key) => ({ key })),
      isMulti: typeof s.type === "string" && s.type.endsWith("[]"),
    };
  } else if (s.oneOf?.every((ss) => isObject(ss) && ss.enum)) {
    const fullOptions = s.oneOf!.flatMap((_ss) => {
      const ss = _ss as JSONB.EnumType;
      return ss.enum.map((key) => {
        return {
          key,
          subLabel: ss.description,
        };
      });
    });

    return {
      fullOptions,
      isMulti: false,
    };
  }

  return undefined;
};
export const JSONBSchemaAllowedOptionsMatch = (
  s: JSONB.JSONBSchema,
): s is JSONB.BasicType => !!getFullOptions(s);
export const JSONBSchemaAllowedOptions = ({
  value,
  schema,
  onChange,
  showErrors,
}: P) => {
  const o = getFullOptions(schema);
  if (!o) {
    return (
      <>
        Could not render JSONBSchemaAllowedOptions schema:{" "}
        {JSON.stringify(schema)}
      </>
    );
  }

  const error =
    showErrors && !isCompleteJSONB(value, schema) ? "Required" : undefined;

  return (
    <FormField
      name={schema.title}
      label={{ children: schema.title, info: schema.description }}
      className={"JSONBSchemaAllowedOptions"}
      value={value}
      optional={schema.optional}
      nullable={schema.nullable}
      fullOptions={o.fullOptions}
      multiSelect={o.isMulti}
      onChange={(newVal) => {
        onChange(newVal);
      }}
      error={error}
    />
  );
};
