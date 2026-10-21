import { isEqual } from "prostgles-types";
import type { DBSchemaTableWithRenderInfo } from "src/dashboard/Dashboard/getTables";
import type { WindowSyncItem } from "../../Dashboard/dashboardUtils";
import type { ColumnConfig } from "@common/ColumnConfig/ColumnConfig";
import { getColumnsWithInfo } from "../tableUtils/getColumnsWithInfo";
import { getMinimalColumnInfo } from "../tableUtils/tableUtils";

export const getAndFixWColumnsConfig = async (
  tables: DBSchemaTableWithRenderInfo[],
  w: WindowSyncItem<"table">,
): Promise<ColumnConfig[]> => {
  const table = tables.find((table) => table.name === w.table_name);
  if (!table) return [];
  const defaultSort = !w.columns && !w.sort?.length ? table.sort : undefined;
  const columns = getMinimalColumnInfo(
    getColumnsWithInfo(table.name, tables, w.columns),
  );
  if (!isEqual(columns, w.columns) || defaultSort?.length) {
    await w.$update({
      columns,
      ...(defaultSort?.length ? { sort: defaultSort } : {}),
    });
  }
  return columns;
};
