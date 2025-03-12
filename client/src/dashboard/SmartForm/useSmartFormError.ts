import {
  isObject,
  type AnyObject,
  type ProstglesError,
  type ValidatedColumnInfo,
} from "prostgles-types";
import { useCallback, useState } from "react";

export type SmartFormErrorState = ReturnType<typeof useSmartFormError>;
export const useSmartFormError = (columns: ValidatedColumnInfo[]) => {
  const [error, setError] = useState<any>();
  const [errors, setErrors] = useState<AnyObject>();

  const parseError = useCallback(
    (error: ProstglesError) => {
      let newError: any =
        typeof error === "string" ? error : (
          (error.table ? `${error.table}: ` : "") +
          (error.message || error.txt || (error as any).detail)
        );
      const newErrors: AnyObject = {};
      if (isObject(error) && error.code === "23503" && error.table) {
        console.log(error);
        newError =
          error.detail ||
          `Table ${error.table} has rows that reference this record (foreign_key_violation)\n\n${error.message || ""}`;
      } else if (Object.keys(error).length && error.constraint) {
        let cols: string[] = [];
        if (error.columns) {
          cols = error.columns;
        } else if (error.column) {
          cols = [error.column];
        }
        cols.forEach((c) => {
          if (columns.find((col) => col.name === c)) {
            let message = error.constraint;
            if (error.code_info === "unique_violation") {
              message =
                "Value already exists. \nConstraint: " + error.constraint;
            }
            newErrors[c] = message;
          }
        });
      }

      if (Object.keys(newErrors).length) {
        newError = error.message || error.detail;
        setErrors(newErrors);
      }
      setError(newError);
      this.setState({
        action: { ...this.state.action, loading: false },
      });
    },
    [columns],
  );

  return {
    error,
    setError,
    errors,
    setErrors,
    parseError,
  };
};
