import type { ColumnConfigWithInfo } from "@common/ColumnConfig/ColumnConfig";
import { isNumericColumn } from "../../W_SQL/getSQLResultTableColumns";

export const isNumericTableColumn = (
  column: Pick<ColumnConfigWithInfo, "nested" | "tsDataType" | "udt_name">,
): boolean => {
  if (!column.nested) return isNumericColumn(column);
  if (
    column.nested.display?.type === "drillable-records" ||
    column.nested.display?.type === "timechart"
  ) {
    return false;
  }
  const shownNestedColumns = column.nested.columns.filter(
    (nestedColumn) => nestedColumn.show,
  );
  return (
    shownNestedColumns.length === 1 && isNumericColumn(shownNestedColumns[0]!)
  );
};
