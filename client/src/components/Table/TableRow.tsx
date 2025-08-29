import React from "react";
import type { TableProps, TableState } from "./Table";
import type {
  ColumnSort,
  ColumnSortSQL,
} from "../../dashboard/W_Table/ColumnMenu/ColumnMenu";
import { getDraggedTableColStyle } from "./TableHeader";
import { classOverride } from "../Flex";
import Btn from "../Btn";
import { sliceText } from "../../../../common/utils";

export type TableRowProps<Sort extends ColumnSort | ColumnSortSQL> = {
  row: any;
  iRow: number;
  rowIndexOffset: number;
  maxCharsPerCell: number;
  draggedCol: TableState["draggedCol"];
  _rows: any[];
  rows: any[];
  visibleCols: TableProps<Sort>["cols"];
} & Pick<
  TableProps<Sort>,
  | "rowClass"
  | "onRowClick"
  | "onRowHover"
  | "activeRowIndex"
  | "activeRowStyle"
  | "maxRowHeight"
  | "rowStyle"
>;
export const TableRow = <Sort extends ColumnSort | ColumnSortSQL>({
  row,
  iRow,
  rowClass,
  onRowClick,
  onRowHover,
  activeRowIndex,
  activeRowStyle,
  visibleCols,
  maxCharsPerCell,
  maxRowHeight,
  rowStyle,
  rowIndexOffset,
  draggedCol,
  rows,
  _rows,
}: TableRowProps<Sort>) => {
  return (
    <div
      role="row"
      className={
        "d-row flex-row f-0 " +
        (rowClass ? rowClass : " ") +
        (onRowClick ? " pointer " : "") +
        (onRowHover || onRowClick ? " hover " : "")
      } // + ((activeRowIndex === iRow && !activeRowStyle)? " active-row " : "")}
      style={{
        ...(activeRowIndex === iRow ? activeRowStyle : {}),
        ...rowStyle,
        maxHeight: `${maxRowHeight || 100}px`,
      }}
      onClick={
        !onRowClick ? undefined : (
          (e) => {
            /** Do not interrupt user from selecting text */
            if (
              e.currentTarget.contains(e.target as Node) &&
              !window.getSelection()?.toString().trim()
            ) {
              onRowClick(row, e);
            }
          }
        )
      }
    >
      {visibleCols.map((col, i) => {
        if (col.onRenderNode) {
          return col.onRenderNode(row, row[col.key]);
        }
        const actualRowIdx = iRow + rowIndexOffset;
        const cellText = parseCell(row[col.key], maxCharsPerCell, true);
        const cellTextVal =
          col.onRender ? null : parseCell(row[col.key], maxCharsPerCell);

        const cellClassName = classOverride(
          `text-sm leading-5 flex-col text-0 o-auto no-scroll-bar ta-left ${col.noRightBorder ? "" : "br"} b-color-1 ` + //  ws-no-wrap  o-hidden to-ellipsis
            `${iRow < _rows.length - 1 ? "bt" : "bt bb"} ` +
            (col.blur ? " blur " : " ") +
            (col.width ? " f-0 " : " f-1 ") +
            (col.onClick ? "  " : " p-p5 "),
          col.className || "",
        );

        return (
          <div
            key={i}
            className={cellClassName}
            style={{
              ...getDraggedTableColStyle(col, i, draggedCol),
              ...(col.getCellStyle?.(row, row[col.key], cellText) || {}),
            }}
            role="cell"
            title={col.onRender ? "" : cellText}
          >
            {col.onClick ?
              <Btn
                onClick={(e) => {
                  col.onClick && col.onClick(row, col, e);
                }}
                className="text-indigo-600 hover:text-indigo-900 h-fit w-fit b-color"
              >
                {cellTextVal}
              </Btn>
            : col.onRender ?
              col.onRender({
                row: row,
                value: row[col.key],
                renderedVal: cellText,
                rowIndex: actualRowIdx,
                prevRow: rows[actualRowIdx - 1],
                nextRow: rows[actualRowIdx + 1],
              })
            : cellTextVal}
          </div>
        );
      })}
    </div>
  );
};

const parseCell = <FT extends boolean = false>(
  d: any,
  maxCharsPerCell = 100,
  getText?: FT,
): FT extends true ? string : React.ReactNode => {
  let node: React.ReactNode;
  let txt: string | undefined;
  if (typeof d === "string") {
    txt = sliceText(d, maxCharsPerCell);
  } else if (typeof d === "number") {
    txt = d.toString();
  } else if (d === null) {
    txt = "NULL";
    node = <i className="text-3">NULL</i>;
  } else if (d === undefined) {
    txt = "";
  } else if (d && Array.isArray(d)) {
    txt = sliceText(
      `[${d.map((c) => parseCell(c)).join(", \n")}]`,
      maxCharsPerCell,
    );
  } else if (d && typeof d.toISOString === "function") {
    txt = d.toISOString();
  } else if (d && Object.prototype.toString.call(d) === "[object Object]") {
    txt = sliceText(JSON.stringify(d, null, 2), maxCharsPerCell);
  } else if (d && d.toString) {
    txt = sliceText(d.toString(), maxCharsPerCell);
  } else {
    txt = `${d}`;
  }

  if (getText) {
    return txt as any;
  }

  return node || (txt as any);
};
