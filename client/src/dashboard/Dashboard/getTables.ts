import type { ColumnOptions, TableOptions } from "@common/managedTableSchema";
import type { DBSchemaTable } from "prostgles-types";
import type { Prgl } from "src/App";
import { getJoinedTables } from "../W_Table/tableUtils/tableUtils";
import type { DBSchemaTablesWJoins } from "./dashboardUtils";

export type DBSchemaTableWithOptions = DBSchemaTable<
  Omit<TableOptions, "columns">,
  ColumnOptions
>;

export const getTables = (
  schemaTables: DBSchemaTableWithOptions[],
  db: Prgl["db"],
): { tables: DBSchemaTablesWJoins } => {
  const tables = schemaTables.map((t) => {
    const result = {
      ...t,
      ...getJoinedTables(schemaTables, t.name, db),
      columns: t.columns.sort((a, b) => {
        return a.ordinal_position - b.ordinal_position;
      }),
    };
    return result;
  });
  return { tables };
};

export type DBSchemaTableWithRenderInfo = ReturnType<
  typeof getTables
>["tables"][number];
