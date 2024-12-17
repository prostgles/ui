import React, { memo, useEffect, useRef, useState } from "react";
import "./Table.css";

import type { AnyObject } from "prostgles-types";
import type { ColumnSort } from "../../dashboard/W_Table/ColumnMenu/ColumnMenu";
import type { ColumnSortMenuProps } from "../../dashboard/W_Table/ColumnMenu/ColumnSortMenu";
import type { ProstglesColumn } from "../../dashboard/W_Table/W_Table";
import type { PanListeners } from "../../dashboard/setPan";
import { setPan } from "../../dashboard/setPan";
import Btn from "../Btn";
import { classOverride } from "../Flex";
import type { PaginationProps } from "./Pagination";
import { Pagination } from "./Pagination";
import type { TableHeaderState } from "./TableHeader";
import { TableHeader, getDraggedTableColStyle } from "./TableHeader";
import type { TestSelectors } from "../../Testing";
import { sliceText } from "../../../../commonTypes/utils";
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

export type TableProps = {
  rowKeys?: string[];
  rows: AnyObject[];
  cols: ProstglesColumn[];
  onColumnReorder?: (newOrder: ProstglesColumn[]) => void;
  whiteHeader?: boolean;
  onSort?: (newSort: ColumnSort[]) => any;
  sort?: ColumnSort[];
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
};
export function useWhatChanged(props: { [prop: string]: unknown }) {
  // cache the last set of props
  const prev = React.useRef(props);

  React.useEffect(() => {
    // check each prop to see if it has changed
    const changed = Object.entries(props).reduce(
      (a, [key, prop]: [string, unknown]) => {
        if (prev.current[key] === prop) return a;
        return {
          ...a,
          [key]: {
            prev: prev.current[key],
            next: prop,
          },
        };
      },
      {} as { [k: string]: any },
    );

    if (Object.keys(changed).length > 0) {
      console.group("Props That Changed");
      console.log(changed);
      console.groupEnd();
    }

    prev.current = props;
  }, [props]);
}

export type TableState = {
  draggedCol?: { node: HTMLDivElement; idx: number; targetIdx?: number };
};
export const Table = (
  props: TableProps & React.HTMLAttributes<HTMLDivElement>,
) => {
  const {
    rows = [],
    cols: c = [],
    onRowClick,
    onRowHover,
    tableStyle = {},
    maxCharsPerCell: rawMaxCharsPerCell = 100,
    maxRowsPerPage = 100,
    pagination: rawPagination,
    activeRowIndex = -1,
    bodyClass = "",
    activeRowStyle = {},
    className = "",
    rowClass = "",
    rowStyle = {},
    maxRowHeight,
    rowKeys,
    afterLastRowContent = null,
  } = props;

  const ref = useRef<HTMLDivElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  const [draggedCol, setDraggedCol] = useState<TableState["draggedCol"]>();

  const maxCharsPerCell =
    !!rawMaxCharsPerCell && Number.isFinite(parseInt(rawMaxCharsPerCell + "")) ?
      parseInt(rawMaxCharsPerCell + "")
    : 100;

  const cols = c.filter((c) => !c.hidden);
  const pagination = rawPagination === "virtual" ? undefined : rawPagination;
  const { page = 1 } = pagination || {};
  let { pageSize = 15 } = pagination || {};
  pageSize = closest(pageSize, PAGE_SIZES) || 25;

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
          rootRef={ref.current}
          setDraggedCol={(draggedCol) => setDraggedCol(draggedCol)}
        />
        <div
          ref={scrollBodyRef}
          className={classOverride(
            "b-y b-default f-1 oy-auto ox-hidden flex-col min-w-fit " +
              (rawPagination === "virtual" ? "" : "no-scroll-bar"),
            bodyClass,
          )}
          role="rowgroup"
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
          {!_rows.length ?
            <div className="text-3 p-2 noselect">No data</div>
          : _rows.map((row, iRow) => {
              const rowKey =
                rowKeys?.map((key) => row[key]).join("-") ||
                iRow + " " + Date.now();
              return (
                <div
                  key={rowKey}
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
                  {cols.map((col, i) => {
                    if (col.onRenderNode) {
                      return col.onRenderNode(row, row[col.key]);
                    }
                    const actualRowIdx = iRow + rowIndexOffset;
                    const cellText = parseCell(
                      row[col.key],
                      maxCharsPerCell,
                      true,
                    );
                    const cellTextVal =
                      col.onRender ? null : (
                        parseCell(row[col.key], maxCharsPerCell)
                      );

                    const cellClassName = classOverride(
                      `text-sm leading-5 flex-col text-0 o-auto no-scroll-bar ta-left br b-gray-100 ` + //  ws-no-wrap  o-hidden to-ellipsis
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
                          ...(col.getCellStyle?.(row, row[col.key], cellText) ||
                            {}),
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
            })
          }
          {afterLastRowContent}
          {!pagination ? null : (
            <Pagination
              key="Pagination"
              {...pagination}
              totalRows={pagination.totalRows ?? rows.length}
            />
          )}
        </div>
      </div>
    </div>
  );
};

type PanProps = TestSelectors &
  PanListeners & {
    style?: React.CSSProperties;
    className?: string;
    threshold?: number;
    children?: React.ReactNode;
  };

export class Pan extends React.Component<PanProps> {
  componentDidMount() {
    this.setListeners();
  }

  setListeners = () => {
    if (this.ref) {
      setPan(this.ref, {
        onPanStart: this.props.onPanStart,
        onPan: this.props.onPan,
        onPanEnd: this.props.onPanEnd,
        onRelease: this.props.onRelease,
        onPress: this.props.onPress,
        threshold: this.props.threshold,
        onDoubleTap: this.props.onDoubleTap,
      });
    }
  };

  ref?: HTMLDivElement;
  render() {
    const { style = {}, className = "", children } = this.props;

    return (
      <div
        ref={(e) => {
          if (e) {
            this.ref = e;
          }
        }}
        id={this.props.id}
        data-command={this.props["data-command"]}
        data-key={this.props["data-key"]}
        style={style}
        className={className}
      >
        {children}
      </div>
    );
  }
}

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
