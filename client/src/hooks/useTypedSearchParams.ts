import { useMemoDeep } from "prostgles-client";
import {
  getJSONBObjectSchemaValidationError,
  type JSONB,
} from "prostgles-types";
import { useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { getKeys } from "src/utils/utils";

export const useTypedSearchParams = <
  JSONBType extends Record<
    string,
    JSONB.EnumType | JSONB.BasicType | Extract<JSONB.FieldType, "string">
  >,
>(
  jsonbType: JSONBType,
): [
  JSONB.GetObjectType<JSONBType>,
  (newValue: JSONB.GetObjectType<JSONBType>) => void,
] => {
  const type = useMemoDeep(() => jsonbType, [jsonbType]);
  const [searchParams, setSearchParamsUnstable] = useSearchParams();
  const setSearchParamsRef = useRef(setSearchParamsUnstable);
  const value = useMemo(() => {
    const rawValue = getKeys(type).reduce(
      (acc, key) => {
        const paramValue = searchParams.get(key);
        if (paramValue !== null) {
          acc[key] = paramValue;
        }
        return acc;
      },
      {} as Record<string, string>,
    );

    const validation = getJSONBObjectSchemaValidationError(type, rawValue, "");

    if (validation.error) {
      console.error(
        "Invalid search params:",
        rawValue,
        "Errors:",
        validation.error,
      );
      return {} as JSONB.GetObjectType<JSONBType>;
    }

    return rawValue as JSONB.GetObjectType<JSONBType>;
  }, [searchParams, type]);

  const setParams = useCallback((newValue: JSONB.GetObjectType<JSONBType>) => {
    setSearchParamsRef.current((prev) => {
      const newSearchParams = new URLSearchParams(prev.toString());
      Object.entries(newValue).forEach(([key, value]) => {
        if (value == null || value === "") {
          newSearchParams.delete(key);
        } else {
          if (
            typeof value !== "string" &&
            typeof value !== "number" &&
            typeof value !== "boolean"
          ) {
            throw new Error(
              `useTypedSearchParams Key "${key}" has illegal value`,
            );
          }
          newSearchParams.set(key, String(value));
        }
      });
      return newSearchParams;
    });
  }, []);

  return [value, setParams];
};
