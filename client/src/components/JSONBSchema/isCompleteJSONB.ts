import type { JSONB } from "prostgles-types";
import { isObject } from "prostgles-types";
import { getEntries } from "@common/utils";

export const getSchemaFromField = (s: JSONB.FieldType): JSONB.FieldTypeObj =>
  typeof s === "string" ? { type: s } : s;

export const getJSONBError = (
  schema: JSONB.JSONBSchema & { optional?: boolean },
  value: any,
) => {
  if (
    (!schema.nullable && value === null) ||
    (!schema.optional && value === undefined)
  ) {
    return "Required";
  }

  return undefined;
};

export const isCompleteJSONB = (
  v: any,
  ss: JSONB.JSONBSchema | JSONB.OneOf | JSONB.FieldType,
) => {
  const s = typeof ss === "string" ? getSchemaFromField(ss) : ss;
  if ((s as JSONB.BasicType).optional && v === undefined) {
    return true;
  }
  if (s.nullable && v === null) {
    return true;
  }
  if ("lookup" in s && s.lookup) {
    return v !== undefined;
  } else if (typeof s.type === "string" && v !== undefined) {
    return true;
  } else if (s.enum?.includes(v)) {
    return true;
  } else if (isObject(s.type) && isObject(v)) {
    return getEntries(s.type).every(([propName, propSchema]) =>
      isCompleteJSONB(v[propName]!, propSchema),
    );
  } else if (s.arrayOf || s.arrayOfType) {
    const arrSchema = s.arrayOf ? s.arrayOf : { type: s.arrayOfType };
    return (
      Array.isArray(v) && v.every((elem) => isCompleteJSONB(elem, arrSchema))
    );
  } else if (s.oneOf || s.oneOfType) {
    return (s.oneOf || s.oneOfType?.map((type) => ({ type })))?.some((oneS) =>
      isCompleteJSONB(v, oneS),
    );
  }
  return false;
};
