import { useCallback, useState } from "react";
import { parseValue } from "./fieldUtils";
import type { SmartFormFieldProps } from "./SmartFormField";
import type { AnyObject } from "prostgles-types";

export const useSmartFormFieldOnChange = (props: SmartFormFieldProps) => {
  const { onChange, column, tableInfo } = props;
  const [error, setError] = useState<any>();

  const onCheckAndChange = useCallback(
    async (_newValue: File[] | string | number | null | AnyObject) => {
      let newValue: string | number | null | { data: File; name: string }[] =
        _newValue as any;

      if (
        _newValue === "" &&
        ["Date", "number", "boolean", "Object"].includes(
          column.tsDataType as string,
        ) &&
        column.is_nullable
      ) {
        newValue = null;
      }

      let error = null;
      try {
        newValue = parseValue(column, _newValue as any, true);
      } catch (err: any) {
        error = err;
      }

      if (!tableInfo.hasFiles) {
        if (
          typeof column.min === "number" &&
          typeof newValue === "number" &&
          newValue < column.min
        ) {
          newValue = Math.max(newValue, column.min);
        } else if (
          typeof column.max === "number" &&
          typeof newValue === "number" &&
          newValue > column.max
        ) {
          newValue = Math.min(newValue, column.max);
        }
      }

      try {
        await onChange?.(newValue);
      } catch (err: any) {
        error = err.toString();
      }
      setError(error);
    },
    [column, onChange, tableInfo.hasFiles],
  );

  return {
    onCheckAndChange,
    error,
  };
};
