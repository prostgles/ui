import { useWhyDidYouUpdate } from "@components/MonacoEditor/useWhyDidYouUpdate";
import { useMemoDeep } from "prostgles-client/dist/react-hooks";
import {
  getJSONBObjectSchemaValidationError,
  type JSONB,
} from "prostgles-types";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { getKeys } from "src/utils";

export const useTypedSearchParams = <
  JSONBType extends Record<
    string,
    JSONB.EnumType | JSONB.BasicType | Extract<JSONB.FieldType, "string">
  >,
>(
  jsonbType: JSONBType,
  removeOnUnmount = false,
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
          newSearchParams.set(key, String(value));
        }
      });
      return newSearchParams;
    });
  }, []);

  const removeOnUnmountRef = useRef(removeOnUnmount);
  removeOnUnmountRef.current = removeOnUnmount;

  useEffect(() => {
    return () => {
      if (removeOnUnmountRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        setSearchParamsRef.current((prev) => {
          const newSearchParams = new URLSearchParams(prev.toString());
          getKeys(type).forEach((key) => {
            newSearchParams.delete(key);
          });
          return newSearchParams;
        });
      }
    };
  }, [type]);

  return [value, setParams];
};
