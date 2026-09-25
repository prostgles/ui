import React from "react";
import type { ProstglesTableColumn } from "../tableUtils/getTableCols";
import { RenderColumn, type RenderColumnProps } from "./RenderColumn";

export const onRenderColumn = (args: RenderColumnProps) => {
  const { column, table, tables, barchartVals, getValues, maxCellChars } = args;
  const onRender: ProstglesTableColumn["onRender"] = ({ row }) => {
    return (
      <RenderColumn
        row={row}
        table={table}
        tables={tables}
        column={column}
        barchartVals={barchartVals}
        getValues={getValues}
        maxCellChars={maxCellChars}
      />
    );
  };

  return onRender;
};
