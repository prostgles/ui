import type { ColumnConfigWithInfo } from "@common/ColumnConfig/ColumnConfig";

export const getColumnSortOptions = (
  column: ColumnConfigWithInfo,
): { key: string; label: string }[] => {
  const label = column.label || column.info?.label || column.name;
  if (!column.nested) return [{ key: column.name, label }];

  const nestedColumns: Pick<
    ColumnConfigWithInfo,
    "name" | "label" | "show" | "info"
  >[] =
    column.nested.display?.type === "timechart" ?
      [
        { name: "date", label: "Date", show: true },
        { name: "value", label: "Value", show: true },
      ]
    : column.nested.columns;
  return nestedColumns
    .filter((nestedColumn) => nestedColumn.show)
    .map((nestedColumn) => ({
      key: `${column.name}.${nestedColumn.name}`,
      label: `${label}.${nestedColumn.label || nestedColumn.info?.label || nestedColumn.name}`,
    }));
};
