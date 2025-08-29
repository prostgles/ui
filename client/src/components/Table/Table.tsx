import React, { useRef, useState } from "react";
import "./Table.css";

import type { AnyObject } from "prostgles-types";
import type {
  ColumnSort,
  ColumnSortSQL,
} from "../../dashboard/W_Table/ColumnMenu/ColumnMenu";
import type { ColumnSortMenuProps } from "../../dashboard/W_Table/ColumnMenu/ColumnSortMenu";
import type { ProstglesColumn } from "../../dashboard/W_Table/W_Table";
import { classOverride } from "../Flex";
import type { PaginationProps } from "./Pagination";
import { TableBody } from "./TableBody";
import type { TableHeaderState } from "./TableHeader";
import { TableHeader } from "./TableHeader";
export const PAGE_SIZES = [5, 10, 15, 20, 25, 50, 100, 200] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export const TableRootClassname = "table-component";
export type OnColRenderRowInfo = {
  row: AnyObject;
  value: any;
  renderedVal: any;
  rowIndex: number;
  prevRow: AnyObject | undefined;
  nextRow: AnyObject | undefined;
};
/**
 * Renders inner cell node
 */
type OnColRender = (rowInfo: OnColRenderRowInfo) => any;

export type TableColumn = {
  key: string | number;
  title?: string;
  label: React.ReactNode;
  subLabel?: React.ReactNode;
  subLabelTitle?: string;

  /**
   * Applied to headers only
   */
  headerClassname?: string;

  /**
   * Applied to cells
   */
  className?: string;
  blur?: boolean;
  hidden?: boolean;
  noRightBorder: boolean;
  /** If it's a joined column then a string array of sortable columns */
  sortable: boolean | ColumnSortMenuProps;
  onClick?: (
    row: AnyObject,
    col: TableColumn,
    e: React.MouseEvent,
  ) => void | any;

  onRender?: OnColRender;

  /**
   * Renders outer cell node
   */
  onRenderNode?: (row: AnyObject, value: any) => any;

  onResize?: (width: number) => any;
  getCellStyle?: (
    row: AnyObject,
    value: any,
    renderedVal: any,
  ) => React.CSSProperties;
  onContextMenu?: (
    e: React.MouseEvent,
    n: HTMLElement,
    col: TableColumn,
    setPopup: (popup: TableHeaderState["popup"]) => void,
  ) => boolean;
  width?: number;
  flex?: number;
};

export type TableProps<Sort extends ColumnSort | ColumnSortSQL> = {
  rowKeys?: string[];
  rows: AnyObject[];
  cols: ProstglesColumn[];
  onColumnReorder?: (newOrder: ProstglesColumn[]) => void;
  onSort?: (newSort: Sort[]) => any;
  sort?: Sort[];
  onRowHover?: (row: any, e: React.MouseEvent<HTMLDivElement>) => any;
  onRowClick?: (
    row: AnyObject | undefined,
    e: React.MouseEvent<HTMLDivElement>,
  ) => any;
  rounded?: boolean;
  tableStyle?: React.CSSProperties;
  maxCharsPerCell?: number | string;
  maxRowHeight?: number;
  maxRowsPerPage?: number;
  pagination?: PaginationProps | "virtual";
  activeRowIndex?: number;
  activeRowStyle?: React.CSSProperties;
  bodyClass?: string;
  rowClass?: string;
  rowStyle?: React.CSSProperties;
  className?: string;
  showSubLabel?: boolean;
  /**
   * Used to render add row button
   */
  afterLastRowContent?: React.ReactNode;
  enableExperimentalVirtualisation?: boolean;
};

export type TableState = {
  draggedCol?: { node: HTMLDivElement; idx: number; targetIdx?: number };
};
export const Table = <Sort extends ColumnSort | ColumnSortSQL>(
  props: TableProps<Sort> & React.HTMLAttributes<HTMLDivElement>,
) => {
  const {
    rows = [],
    cols: c = [],
    tableStyle = {},
    maxRowsPerPage = 100,
    className = "",
  } = props;

  const ref = useRef<HTMLDivElement>(null);

  const [draggedCol, setDraggedCol] = useState<TableState["draggedCol"]>();

  const cols = c.filter((c) => !c.hidden);

  const tableKey =
    cols.map((c) => `${c.key}${c.width}`).join() + draggedCol?.idx;
  return (
    <div
      key={tableKey}
      className={classOverride(
        TableRootClassname + " o-auto flex-col f-1 min-h-0 min-w-0 ",
        className,
      )}
      ref={ref}
    >
      <div
        role="table"
        className={"min-w-fit min-h-0 b b-default flex-col h-full"}
        style={tableStyle}
      >
        <TableHeader
          {...props}
          rootRef={ref}
          setDraggedCol={(draggedCol) => setDraggedCol(draggedCol)}
        />
        <TableBody
          cols={cols}
          rows={rows}
          activeRowIndex={props.activeRowIndex}
          maxCharsPerCell={props.maxCharsPerCell}
          maxRowHeight={props.maxRowHeight}
          maxRowsPerPage={maxRowsPerPage}
          activeRowStyle={props.activeRowStyle}
          afterLastRowContent={props.afterLastRowContent}
          bodyClass={props.bodyClass}
          rowClass={props.rowClass}
          rowStyle={props.rowStyle}
          onRowClick={props.onRowClick}
          onRowHover={props.onRowHover}
          draggedCol={draggedCol}
          pagination={props.pagination}
          enableExperimentalVirtualisation={
            props.enableExperimentalVirtualisation
          }
        />
      </div>
    </div>
  );
};

export function closest<Num extends number>(
  v: number,
  arr: readonly Num[] | Num[],
): Num | undefined {
  return arr
    .map((av) => ({ av, diff: Math.abs(v - av) }))
    .sort((a, b) => a.diff - b.diff)[0]?.av;
}
export function closestIndexOf<Num extends number>(
  v: number,
  arr: readonly Num[] | Num[],
): Num | undefined {
  return arr
    .map((av, i) => ({ i, av, diff: Math.abs(v - av) }))
    .sort((a, b) => a.diff - b.diff)[0]?.i;
}

export const onWheelScroll =
  (parentClassname?: string): React.WheelEventHandler<HTMLElement> =>
  (e: React.WheelEvent<HTMLElement>) => {
    if (e.shiftKey || e.ctrlKey || !e.currentTarget.contains(e.target as any))
      return;

    const oFlowY = (el?: HTMLElement | null) => {
      return el && el.scrollWidth > el.clientWidth;
    };
    let maxDepth = 5;
    let el =
      !parentClassname ?
        e.currentTarget
      : e.currentTarget.parentElement?.closest<HTMLElement>(
          "." + parentClassname,
        );
    let sel;
    while (maxDepth > 0) {
      if (oFlowY(el)) {
        sel = el;
        maxDepth = 0;
      } else {
        el = el?.parentElement;
        maxDepth--;
      }
    }
    // if(sel) sel.scrollLeft += Math.sign(e.deltaY) * 50
    if (sel) {
      sel.scrollLeft -= (e.nativeEvent as any).wheelDeltaY || -e.deltaY;
      // e.preventDefault();
    }
  };
