import type { DBSchemaTableWJoins } from "../../../Dashboard/dashboardUtils";
import type { ColumnConfig } from "../ColumnConfig";

export const getTableIdentityColumns = (
  table: DBSchemaTableWJoins,
  columnConfig?: ColumnConfig[],
) => {
  const uniqueColumnNames = table.uniqueColumnGroups
    ?.filter(
      (columnNames) =>
        columnNames.length &&
        columnNames.every(
          (columnName) =>
            table.columns.some(
              (column) =>
                column.name === columnName && column.filter && column.select,
            ) &&
            (!columnConfig ||
              columnConfig.some(
                (column) =>
                  column.name === columnName && column.show && !column.computedConfig,
              )),
        ),
    )
    .toSorted((a, b) => a.length - b.length)[0];
  return table.columns.filter((column) =>
    uniqueColumnNames?.includes(column.name),
  );
};
