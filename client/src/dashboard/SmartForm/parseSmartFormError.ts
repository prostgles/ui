import { isObject, type ProstglesError } from "prostgles-types";
import type { SmartFormState } from "./SmartForm";

export const parseSmartFormError = (
  error: ProstglesError,
  columns: { name: string }[],
) => {
  let errState: Pick<SmartFormState, "error" | "errors"> = {
    error:
      typeof error === "string" ? error : (
        (error.table ? `${error.table}: ` : "") +
        (error.message || error.txt || (error as any).detail)
      ),
  };
  if (isObject(error) && error.code === "23503" && error.table) {
    console.log(error);
    errState = {
      error:
        error.detail ||
        `Table ${error.table} has rows that reference this record (foreign_key_violation)\n\n${error.message || ""}`,
    };
  } else if (Object.keys(error).length && error.constraint) {
    let cols: string[] = [];
    const errors = {};
    if (error.columns) {
      cols = error.columns;
    } else if (error.column) {
      cols = [error.column];
    }
    cols.forEach((c) => {
      if (columns.find((col) => col.name === c)) {
        let message = error.constraint;
        if (error.code_info === "unique_violation") {
          message = "Value already exists. \nConstraint: " + error.constraint;
        }
        errors[c] = message;
      }
    });
    if (Object.keys(errors).length) {
      errState = { errors, error: error.message || error.detail };
    }
  }

  return errState;
};
