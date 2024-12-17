import type { CommonWindowProps } from "../../Dashboard/Dashboard";
import type { WindowData } from "../../Dashboard/dashboardUtils";
import type { ColumnConfigWInfo } from "../W_Table";

export const getColWInfo = (
  tables: CommonWindowProps["tables"],
  w: Pick<WindowData<"table">, "columns" | "table_name">,
): ColumnConfigWInfo[] => {
  const { columns: cols, table_name } = w;
  const table = tables.find((t) => t.name === table_name);
  if (!table) {
    console.error("Table not found:", table_name);
    return [];
  }
  const isAdditionalComputed = (c: ColumnConfigWInfo) =>
    c.computedConfig && !c.computedConfig.isColumn;

  //@ts-ignore
  const columns: ColumnConfigWInfo[] = (cols ?? [])
    .map((c) => ({
      ...c,
      info:
        isAdditionalComputed(c) ? undefined : (
          table.columns.find((_c) => _c.select && _c.name === c.name)
        ),
    }))
    .filter((c) => {
      /** Remove dropped columns */
      if (!c.computedConfig && !c.info && !c.nested) {
        return false;
      }
      return true;
    }) as ColumnConfigWInfo[];

  const newCols = table.columns.filter(
    (c) => !columns.find((r) => r.info && r.name === c.name),
  );

  return structuredClone(
    columns.concat(
      newCols.map((c) => ({
        info: c,
        name: c.name,
        show: true,
      })),
    ),
  ).filter((c) => !c.info || c.info.select);
};
