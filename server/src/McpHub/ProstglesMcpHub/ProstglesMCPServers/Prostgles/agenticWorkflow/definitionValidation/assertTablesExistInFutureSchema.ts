import type { TableSchema } from "prostgles-server/dist/DboBuilder/DboBuilder";

export const assertTablesExistInFutureSchema = (
  tablesOrViews: TableSchema[],
  tablesToCheck: string[],
  errMsg: string,
) => {
  const invalidTables = tablesToCheck.filter(
    (tableName) => !tablesOrViews.some((tov) => tov.name === tableName),
  );
  if (invalidTables.length) {
    throw `${errMsg} the following table names do not match any new tables or existing tables: ${JSON.stringify(invalidTables)}`;
  }
};
