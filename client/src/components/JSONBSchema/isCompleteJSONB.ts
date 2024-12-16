import type { JSONB } from "prostgles-types";
import { getKeys, isObject } from "prostgles-types";

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

export const isCompleteJSONB = (v: any, s: JSONB.JSONBSchema | JSONB.OneOf) => {
  if ((s as JSONB.BasicType).optional && v === undefined) {
    return true;
  }
  if (s.nullable && v === null) {
    return true;
  }

  if ((s as any).lookup) {
    return v !== undefined;
  }
  if (typeof s.type === "string" && v !== undefined) {
    return true;
  }
  if (s.enum?.includes(v)) {
    return true;
  }
  if (isObject(s.type) && isObject(v)) {
    return getKeys(s.type).every((propName) =>
      isCompleteJSONB(v[propName]!, s.type![propName]),
    );
  }
  if (s.arrayOf || s.arrayOfType) {
    const arrSchema =
      s.arrayOf ? getSchemaFromField(s.arrayOf) : { ...s, type: s.arrayOfType };
    return (
      Array.isArray(v) && v.every((elem) => isCompleteJSONB(elem, arrSchema))
    );
  }
  if (s.oneOf || s.oneOfType) {
    return (s.oneOf || s.oneOfType?.map((type) => ({ type })))?.some((oneS) =>
      isCompleteJSONB(v, oneS),
    );
  }
  return false;
};
