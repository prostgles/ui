import React, { useCallback, useEffect, useRef } from "react";
import "./Table.css";

import type {
  ColumnSort,
  ColumnSortSQL,
} from "../../dashboard/W_Table/ColumnMenu/ColumnMenu";
import { classOverride } from "../Flex";
import { Pagination } from "./Pagination";
import { closest, PAGE_SIZES, type TableProps, type TableState } from "./Table";
import { TableRow } from "./TableRow";
import { useVirtualisedRows } from "./useVirtualisedRows";

export const TableBody = <Sort extends ColumnSort | ColumnSortSQL>(
  props: Pick<
    TableProps<Sort>,
    | "rowClass"
    | "onRowClick"
    | "onRowHover"
    | "activeRowIndex"
    | "activeRowStyle"
    | "maxRowHeight"
    | "rowStyle"
    | "rows"
    | "cols"
    | "maxCharsPerCell"
    | "maxRowsPerPage"
    | "pagination"
    | "bodyClass"
    | "rowKeys"
    | "afterLastRowContent"
    | "enableExperimentalVirtualisation"
  > &
    Pick<TableState, "draggedCol">,
) => {
  const {
    rows = [],
    cols: c = [],
    onRowClick,
    onRowHover,
    maxCharsPerCell: rawMaxCharsPerCell = 100,
    maxRowsPerPage = 100,
    pagination: rawPagination,
    activeRowIndex = -1,
    bodyClass = "",
    activeRowStyle = {},
    rowClass = "",
    rowStyle = {},
    maxRowHeight,
    rowKeys,
    afterLastRowContent = null,
    draggedCol,
    enableExperimentalVirtualisation,
  } = props;

  const scrollBodyRef = useRef<HTMLDivElement>(null);

  const maxCharsPerCell =
    !!rawMaxCharsPerCell && Number.isFinite(parseInt(rawMaxCharsPerCell + "")) ?
      parseInt(rawMaxCharsPerCell + "")
    : 100;

  const visibleCols = c.filter((c) => !c.hidden);
  const pagination = rawPagination === "virtual" ? undefined : rawPagination;
  const { page = 0 } = pagination || {};
  const pageSize = closest(pagination?.pageSize ?? 15, PAGE_SIZES) || 25;

  let rowIndexOffset = 0;
  let _rows = rows.map((r) => ({ ...r }));
  if (rawPagination !== "virtual") {
    if (pagination && !pagination.onPageChange) {
      rowIndexOffset = page * pageSize;
      _rows = _rows.slice(rowIndexOffset, (page + 1) * pageSize);
    }
    if (_rows.length > maxRowsPerPage) {
      console.warn("Exceeded maxRowsPerPage");
      _rows = _rows.slice(0, maxRowsPerPage);
    }
  }

  const { onScroll } = useVirtualisedRows({
    rows: _rows,
    scrollBodyRef,
    mode: enableExperimentalVirtualisation ? "auto" : "off",
  });

  return (
    <div
      className={classOverride(
        "TableBody b-y b-default f-1 oy-auto ox-hidden flex-col min-w-fit relative " +
          (rawPagination === "virtual" ? "" : "no-scroll-bar"),
        bodyClass,
      )}
      role="rowgroup"
      onScroll={onScroll}
      onPointerUp={
        !onRowClick ? undefined : (
          (e) => {
            if (e.target === e.currentTarget) {
              onRowClick(undefined, e);
            }
          }
        )
      }
    >
      <div ref={scrollBodyRef} className="relative f-0">
        {!_rows.length ?
          <div className="text-3 p-2 noselect">No data</div>
        : _rows.map((row, iRow) => {
            const rowKey = rowKeys?.map((key) => row[key]).join("-") || iRow; // + " " + Date.now();
            return (
              <TableRow
                visibleCols={visibleCols}
                key={rowKey}
                row={row}
                iRow={iRow}
                _rows={_rows}
                rows={rows}
                maxCharsPerCell={maxCharsPerCell}
                rowIndexOffset={rowIndexOffset}
                draggedCol={draggedCol}
                activeRowIndex={activeRowIndex}
                activeRowStyle={activeRowStyle}
                maxRowHeight={maxRowHeight}
                onRowClick={onRowClick}
                onRowHover={onRowHover}
                rowClass={rowClass}
                rowStyle={rowStyle}
              />
            );
          })
        }
      </div>
      {afterLastRowContent}
      {!pagination ? null : (
        <Pagination
          key="Pagination"
          {...pagination}
          totalRows={pagination.totalRows ?? rows.length}
        />
      )}
    </div>
  );
};
