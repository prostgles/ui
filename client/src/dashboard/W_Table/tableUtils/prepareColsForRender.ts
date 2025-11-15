import type { WindowSyncItem } from "../../Dashboard/dashboardUtils";
import { isNumericColumn } from "../../W_SQL/getSQLResultTableColumns";
import type { ColumnConfigWInfo } from "../W_Table";
import type { ProstglesTableColumn } from "./getTableCols";

export const prepareColsForRender = (
  cols: ProstglesTableColumn[],
  getWCols: () => ColumnConfigWInfo[],
  w: WindowSyncItem<"table">,
) => {
  return cols
    .filter((c) => {
      const wcols = getWCols();
      if (Array.isArray(wcols)) {
        const match = wcols.find((_c) => _c.name === c.name);
        if (match) {
          return Boolean(match.show);
        }
      }
      return !c.hidden;
    })
    .sort((a, b) => {
      const wcols = getWCols();
      if (Array.isArray(wcols)) {
        const _a = wcols.findIndex((c) => c.name === a.name),
          _b = wcols.findIndex((c) => c.name === b.name);
        if (_a > -1 && _b > -1) {
          return _a - _b;
        }
      }
      return 0;
    })
    .map((c) => ({
      ...c,
      /* Align numbers to right for an easier read */
      headerClassname:
        c.style?.type === "Barchart" ? ""
        : (
          isNumericColumn(c) ||
          c.nested?.columns.filter(
            (nc) =>
              nc.show &&
              nc.computedConfig &&
              isNumericColumn(nc.computedConfig),
          ).length === 1
        ) ?
          " jc-end  "
        : " ",
      className: isNumericColumn(c) ? " ta-right " : " ",
      onResize: async (width) => {
        const wcols = getWCols();
        const currentCols = wcols;

        const newCols = currentCols.map((_c) => {
          if (_c.name === c.key) {
            try {
              _c.width = width;
            } catch (e) {
              console.error(e);
            }
          }
          return { ..._c };
        });
        w.$update({
          columns: JSON.parse(JSON.stringify(newCols)),
        });
      },
    }));
};
