import {
  _PG_numbers,
  includes,
  type ValidatedColumnInfo,
} from "prostgles-types";
import { onRenderColumn } from "../W_Table/tableUtils/onRenderColumn";
import type { W_SQLResultsProps } from "./W_SQLResults";

export const getSQLResultTableColumns = ({
  cols = [],
  tables,
  onResize,
  maxCharsPerCell,
  rows = [],
}: Pick<W_SQLResultsProps, "cols" | "tables" | "onResize" | "rows"> & {
  maxCharsPerCell: number | undefined;
}) => {
  return cols.map((c, i) => {
    const isNumeric = isNumericColumn(c);
    return {
      ...c,
      key: i,
      label: c.name,
      filter: false,
      /* Align numbers to right for an easier read */
      headerClassname: isNumeric ? " jc-end  " : " ",
      className: isNumeric ? " ta-right " : " ",
      onRender: onRenderColumn({
        c: { ...c, name: i.toString(), format: undefined },
        getValues: () => rows.map((r) => r[i]),
        table: undefined,
        tables,
        barchartVals: undefined,
        maxCellChars: maxCharsPerCell || 1000,
        maximumFractionDigits: 12,
      }),
      onResize: (width) => {
        const newCols = cols.map((_c) => {
          if (_c.key === c.key) {
            _c.width = width;
          }
          return _c;
        });
        onResize(newCols);
      },
    };
  });
};

export const isNumericColumn = ({
  tsDataType,
  udt_name,
}: Pick<ValidatedColumnInfo, "tsDataType" | "udt_name">): boolean => {
  return tsDataType === "number" || includes(_PG_numbers, udt_name);
};
