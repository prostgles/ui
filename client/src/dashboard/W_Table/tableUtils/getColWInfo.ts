import type {
  DBSchemaTableWJoins,
  WindowData,
} from "../../Dashboard/dashboardUtils";
import type { ColumnConfigWInfo } from "../W_Table";

export const getColWInfo = (
  table: DBSchemaTableWJoins,
  cols: WindowData<"table">["columns"],
): ColumnConfigWInfo[] => {
  const tableColumns = table.columns.slice(0);
  const isAdditionalComputed = (c: ColumnConfigWInfo) =>
    c.computedConfig && !c.computedConfig.isColumn;

  const columns: ColumnConfigWInfo[] = (cols ?? [])
    .map((c) => ({
      ...c,
      info:
        isAdditionalComputed(c) ? undefined : (
          tableColumns.find((_c) => _c.select && _c.name === c.name)
        ),
    }))
    .filter((c) => {
      /** Remove dropped columns */
      if (!c.computedConfig && !c.info && !c.nested) {
        return false;
      }
      return true;
    }) as ColumnConfigWInfo[];

  const newCols = tableColumns.filter(
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
