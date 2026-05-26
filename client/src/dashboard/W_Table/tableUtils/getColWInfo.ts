import { omitKeys } from "prostgles-types";
import type { DBSchemaTableWithRenderInfo } from "src/dashboard/Dashboard/getTables";
import type { WindowData } from "../../Dashboard/dashboardUtils";
import type { ColumnConfigWInfo } from "../W_Table";

export const getColWInfo = (
  table: DBSchemaTableWithRenderInfo,
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
          omitKeys(
            tableColumns.find((_c) => _c.select && _c.name === c.name)!,
            ["renderAs", "style"],
          )
        ),
    }))
    .filter((c) => {
      /** Remove dropped columns */
      if (!c.computedConfig && !c.info && !c.nested) {
        return false;
      }
      return true;
    });

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
