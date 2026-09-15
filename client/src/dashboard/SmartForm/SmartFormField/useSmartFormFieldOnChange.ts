import type { LocalMedia } from "@components/FileInput/FileInput";
import type { AnyObject, MaybePromise } from "prostgles-types";
import { useCallback, useState } from "react";
import type { ColumnData } from "../SmartFormNewRowDataHandler";
import { parseValue } from "./fieldUtils";
import type { SmartFormFieldProps } from "./SmartFormField";

export const useSmartFormFieldOnChange = (
  props: Pick<SmartFormFieldProps, "column" | "table"> & {
    onChange: (newColData: ColumnData) => MaybePromise<void>;
  },
) => {
  const { onChange, column, table } = props;
  const [error, setError] = useState<unknown>();

  const onCheckAndChange = useCallback(
    async (_newValue: File[] | string | number | null | AnyObject) => {
      let newValue = _newValue as string | number | null | LocalMedia[];

      if (
        _newValue === "" &&
        ["Date", "number", "boolean", "Object"].includes(column.tsDataType) &&
        column.is_nullable
      ) {
        newValue = null;
      }

      let error = null;
      try {
        newValue = parseValue(column, _newValue, true);
      } catch (err: any) {
        error = err;
      }

      if (!table.hasFiles) {
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
        await onChange({ type: "column", value: newValue });
      } catch (err: any) {
        error = err.toString();
      }
      setError(error);
    },
    [column, onChange, table.hasFiles],
  );

  return {
    onCheckAndChange,
    error,
  };
};
