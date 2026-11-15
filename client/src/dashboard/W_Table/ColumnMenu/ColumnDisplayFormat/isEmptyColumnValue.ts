import type { ColumnConfigWithInfo } from "@common/ColumnConfig/ColumnConfig";
import { isObject } from "prostgles-types";
import { isFileAnnotationPreview } from "../../ManagedColumn/fileAnnotation";
import { getColumnActions, getColumnFormat } from "./getFormatColumnSelect";

export const isEmptyColumnValue = (
  column: Pick<ColumnConfigWithInfo, "name" | "format" | "info" | "nested">,
  row: Record<string, unknown>,
): boolean => {
  const value = row[column.name];
  if (column.nested) return value == null;
  const format = getColumnFormat(column);

  if (format?.type === "Stopwatch") {
    return row[format.params.startColumn] == null;
  }
  if (
    format?.type === "Avatar" &&
    (format.params?.firstNameColumn || format.params?.lastNameColumn)
  ) {
    return ![format.params.firstNameColumn, format.params.lastNameColumn].some(
      (columnName) => {
        const name = columnName && row[columnName];
        return typeof name === "string" && !!name.trim();
      },
    );
  }

  if (value != null) return false;
  /* Actions determine their own visibility from the row and permissions. */
  if (getColumnActions(column)) return false;

  if (format?.type === "JSON Diff" || format?.type === "Text Diff") {
    return (
      row[format.params.oldColumn] === undefined ||
      row[format.params.newColumn] === undefined
    );
  }
  if (format?.type === "URL") {
    const { urlColumn, linkText } = format.params ?? {};
    const url = urlColumn && row[urlColumn];
    return !(
      linkText &&
      ((typeof url === "string" && url.trim()) || typeof url === "number")
    );
  }
  if (format?.type === "Internal") {
    const { params } = format;
    if (params.component === "Alert") {
      return !(params.field === "definition" && value === null);
    }
    const joinedValue = row[params.dataKey];
    const joinedRow = Array.isArray(joinedValue) ? joinedValue[0] : joinedValue;
    if (params.component === "FileAnnotation") {
      return !isFileAnnotationPreview(joinedRow);
    }
    if (params.component === "File") {
      return !(
        isObject(joinedRow) &&
        typeof joinedRow.id === "string" &&
        joinedRow.id
      );
    }
  }
  return true;
};
