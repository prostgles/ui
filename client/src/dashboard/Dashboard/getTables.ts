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
        const defaultOrder = (name: string) => {
          const index = t.defaultColumns?.indexOf(name) ?? -1;
          return index < 0 ? t.columns.length : index;
        };
        const order = defaultOrder(a.name) - defaultOrder(b.name);
        if (order) return order;
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
