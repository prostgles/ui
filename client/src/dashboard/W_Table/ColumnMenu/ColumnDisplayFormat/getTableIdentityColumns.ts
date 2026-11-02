import type { DBSchemaTableWJoins } from "../../../Dashboard/dashboardUtils";
import type { ColumnConfig } from "@common/ColumnConfig/ColumnConfig";

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
                  column.name === columnName &&
                  column.show &&
                  !column.computedConfig &&
                  !column.nested &&
                  column.format?.type !== "Action" &&
                  column.format?.type !== "ActionColumns",
              )),
        ),
    )
    .toSorted((a, b) => a.length - b.length)[0];
  return table.columns.filter((column) =>
    uniqueColumnNames?.includes(column.name),
  );
};

export const getTableRowIdentityColumns = (
  table: DBSchemaTableWJoins,
  columnConfig?: ColumnConfig[],
) => {
  const primaryKeyColumns = getTableIdentityColumns(
    {
      ...table,
      uniqueColumnGroups: [
        table.columns
          .filter((column) => column.is_pkey)
          .map(({ name }) => name),
      ],
    },
    columnConfig,
  );
  return primaryKeyColumns.length ? primaryKeyColumns : (
      getTableIdentityColumns(table, columnConfig)
    );
};
