import type { DBSchemaTableWJoins } from "../../../Dashboard/dashboardUtils";

export const getTableIdentityColumns = (table: DBSchemaTableWJoins) => {
  const primaryKeyColumns = table.columns.filter(
    ({ is_pkey, filter, select }) => is_pkey && filter && select,
  );
  if (primaryKeyColumns.length) return primaryKeyColumns;

  const uniqueColumnNames = table.uniqueColumnGroups?.find((columnNames) =>
    columnNames.every((columnName) =>
      table.columns.some(
        (column) =>
          column.name === columnName && column.filter && column.select,
      ),
    ),
  );
  return table.columns.filter((column) =>
    uniqueColumnNames?.includes(column.name),
  );
};
