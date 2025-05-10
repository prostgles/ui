import { onRenderColumn } from "../W_Table/tableUtils/onRenderColumn";
import type { W_SQLResultsProps } from "./W_SQLResults";

export const getSQLResultTableColumns = ({
  cols = [],
  tables,
  onResize,
  maxCharsPerCell,
}: Pick<W_SQLResultsProps, "cols" | "tables" | "onResize"> & {
  maxCharsPerCell: number | undefined;
}) => {
  return cols.map((c, i) => ({
    ...c,
    key: i,
    label: c.name,
    filter: false,
    /* Align numbers to right for an easier read */
    headerClassname: c.tsDataType === "number" ? " jc-end  " : " ",
    className: c.tsDataType === "number" ? " ta-right " : " ",
    onRender: onRenderColumn({
      c: { ...c, name: i.toString(), format: undefined },
      table: undefined,
      tables,
      barchartVals: undefined,
      maxCellChars: maxCharsPerCell || 1000,
      maximumFractionDigits: 12,
    }),
    onResize: async (width) => {
      const newCols = cols.map((_c) => {
        if (_c.key === c.key) {
          _c.width = width;
        }
        return _c;
      });
      onResize(newCols);
    },
  }));
};
