import {
  _PG_numbers,
  includes,
  type ValidatedColumnInfo,
} from "prostgles-types";
import React from "react";
import { RenderValue } from "../SmartForm/SmartFormField/RenderValue";
import type { ProstglesColumn } from "./W_SQL";
import type { W_SQLResultsProps } from "./W_SQLResults";

export const getSQLResultTableColumns = ({
  cols = [],
  onResize,
  maxCharsPerCell,
  rows = [],
}: Pick<W_SQLResultsProps, "cols" | "onResize" | "rows"> & {
  maxCharsPerCell: number | undefined;
}) => {
  const tableColumns: ProstglesColumn[] = cols.map((c, i) => {
    const isNumeric = isNumericColumn(c);

    return {
      ...c,
      label: c.name,
      filter: false,
      computed: false,
      /* Align numbers to right for an easier read */
      headerClassname: isNumeric ? " jc-end  " : " ",
      className: isNumeric ? " ta-right " : " ",
      onRender: ({ value }) => {
        // const table =
        // c.tableID ? tables.find((t) => t.oid == c.tableID) : undefined;
        /** TODO: if matches table and is only pkey (or we have all pkey columns) allow opening the row details
         * Use href to link to the row details page as in AskLLM
         */
        return (
          <RenderValue
            column={c}
            value={value}
            getValues={() => rows.map((r) => r[i])}
            maximumFractionDigits={12}
            maxLength={maxCharsPerCell || 1000}
          />
        );
      },
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
  return tableColumns;
};

export const isNumericColumn = ({
  tsDataType,
  udt_name,
}: Pick<ValidatedColumnInfo, "tsDataType" | "udt_name">): boolean => {
  return tsDataType === "number" || includes(_PG_numbers, udt_name);
};
