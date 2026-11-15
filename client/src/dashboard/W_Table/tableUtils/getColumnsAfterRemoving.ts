import type {
  ColumnConfig,
  ColumnConfigWithInfo,
} from "@common/ColumnConfig/ColumnConfig";

export const getColumnsAfterRemoving = (
  columns: ColumnConfig[],
  removedColumn: Pick<ColumnConfigWithInfo, "name" | "defaultConfig">,
): ColumnConfig[] =>
  columns.flatMap((column) => {
    if (column.name === removedColumn.name) {
      return removedColumn.defaultConfig ?
          [{ name: column.name, show: false }]
        : [];
    }
    if (column.name === removedColumn.defaultConfig?.nested?.fallbackColumn) {
      return [{ ...column, show: true }];
    }
    return [column];
  });
