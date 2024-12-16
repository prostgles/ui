import React from "react";
import type { TableProps, TableState } from "./Table";
import { Pan, TableRootClassname, onWheelScroll } from "./Table";
import type { AnyObject } from "prostgles-types";
import { isObject } from "prostgles-types";
import { vibrateFeedback } from "../../dashboard/Dashboard/dashboardUtils";
import { quickClone } from "../../utils";
import type { ProstglesColumn } from "../../dashboard/W_Table/W_Table";
import type { ColumnSortMenuProps } from "../../dashboard/W_Table/ColumnMenu/ColumnSortMenu";
import {
  ColumnSortMenu,
  getDefaultSort,
} from "../../dashboard/W_Table/ColumnMenu/ColumnSortMenu";
import type { PopupProps } from "../Popup/Popup";
import Popup from "../Popup/Popup";
import { classOverride } from "../Flex";
import { getSortColumn } from "../../dashboard/W_Table/tableUtils/tableUtils";

type TableHeaderProps = Pick<
  TableProps,
  | "cols"
  | "sort"
  | "onSort"
  | "whiteHeader"
  | "onColumnReorder"
  | "showSubLabel"
> & {
  setDraggedCol: (newCol: TableState["draggedCol"]) => void;
  rootRef?: HTMLDivElement | null;
} & Pick<TableState, "draggedCol">;

export type TableHeaderState = Pick<TableState, "draggedCol"> & {
  popup?: PopupProps & { key: string };
  showNestedSortOptions?: {
    anchorEl: HTMLElement;
  } & ColumnSortMenuProps;
};
export class TableHeader extends React.Component<
  TableHeaderProps,
  TableHeaderState
> {
  state: Readonly<TableHeaderState> = {
    draggedCol: undefined,
  };

  render(): React.ReactNode {
    const {
      cols,
      sort: s = [],
      onColumnReorder,
      onSort,
      whiteHeader = false,
    } = this.props;
    const setDraggedCol = (draggedCol: TableHeaderState["draggedCol"]) =>
      this.setState({ draggedCol });
    const { draggedCol, showNestedSortOptions, popup } = this.state;

    let sort: Required<TableProps>["sort"] = [];
    if (Array.isArray(s)) {
      sort = s.map((s) => ({ ...s }));
    }

    return (
      <>
        {showNestedSortOptions && (
          <Popup
            title="Sort by"
            clickCatchStyle={{ opacity: 0 }}
            anchorEl={showNestedSortOptions.anchorEl}
            positioning="beneath-left"
            onClose={() => this.setState({ showNestedSortOptions: undefined })}
          >
            <ColumnSortMenu {...showNestedSortOptions} />
          </Popup>
        )}

        {!popup ? null : (
          <Popup
            contentStyle={{
              overflow: "unset",
            }}
            anchorEl={popup.anchorEl}
            positioning={popup.positioning}
            clickCatchStyle={{ opacity: 0.25, backdropFilter: "blur(1px)" }}
            contentClassName=""
            {...popup}
            onClose={() => {
              this.setState({ popup: undefined });
            }}
          >
            {popup.content}
          </Popup>
        )}
        <div
          role="row"
          className="noselect f-0 flex-row shadow bg-color-1"
          onWheel={onWheelScroll(TableRootClassname)}
        >
          {cols.map((col, iCol) => {
            const mySort = sort.find((s) => getSortColumn(s, [col]));
            const className =
              "flex-col h-full min-w-0 px-p5 py-p5 text-left font-14 relative " +
              " font-medium text-0 tracking-wider to-ellipsis jc-center " +
              (onSort && col.sortable ? " pointer " : "") +
              // (whiteHeader? " " : " bg-color-1  ") +
              (col.onContextMenu ? " contextmenu " : "") +
              (col.width ? " f-0 " : " f-1 ");

            return (
              <div
                key={iCol}
                className={classOverride(className, "br b-gray-100")}
                {...(col.onContextMenu ? iosContextMenuPolyfill() : {})}
                onContextMenu={
                  !col.onContextMenu ? undefined : (
                    (e) => {
                      if (
                        col.onContextMenu &&
                        !e.currentTarget.classList.contains("resizing-ew")
                      ) {
                        vibrateFeedback(25);
                        return col.onContextMenu(
                          e,
                          e.nativeEvent.target as HTMLElement,
                          col,
                          (popup) => this.setState({ popup }),
                        );
                      }
                    }
                  )
                }
                role="columnheader"
                style={{ ...getDraggedTableColStyle(col, iCol, draggedCol) }} //  borderRight: "1px solid var(--gray-100)"
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", col.name + "");
                  if (onColumnReorder) {
                    setDraggedCol({ idx: iCol, node: e.currentTarget });
                  }
                }}
                onDragOver={
                  !onColumnReorder ? undefined : (
                    (e) => {
                      if (
                        draggedCol &&
                        draggedCol.idx !== iCol &&
                        draggedCol.targetIdx !== iCol
                      ) {
                        setDraggedCol({ ...draggedCol, targetIdx: iCol });
                      }
                      e.preventDefault();
                      return false;
                    }
                  )
                }
                onDragLeave={
                  !onColumnReorder ? undefined : (
                    (e) => {
                      if (e.target === e.currentTarget) {
                        setDraggedCol({ ...draggedCol!, targetIdx: undefined });
                      }
                    }
                  )
                }
                onDragEnd={
                  !onColumnReorder ? undefined : (
                    (e) => {
                      setDraggedCol(undefined);
                    }
                  )
                }
                onDrop={
                  !onColumnReorder ? undefined : (
                    (e) => {
                      const droppedOnOtherColumn = draggedCol?.idx !== iCol;
                      if (draggedCol && droppedOnOtherColumn) {
                        let newCols = cols.slice(0);
                        const sourceCol = newCols[draggedCol.idx];
                        const targetCol = col;

                        if (!sourceCol) return;
                        newCols = newCols.filter(
                          (c) => c.key !== sourceCol.key,
                        );
                        const targetIdx = newCols.findIndex(
                          (c) => c.key === targetCol.key,
                        );
                        newCols.splice(
                          targetIdx + (draggedCol.idx < targetIdx + 1 ? 1 : 0),
                          0,
                          sourceCol,
                        );

                        onColumnReorder(newCols);
                      }
                      setDraggedCol(undefined);
                    }
                  )
                }
                onClick={
                  !onSort || !col.sortable ?
                    undefined
                  : (e) => {
                      if (
                        e.button ||
                        (e.target as HTMLDivElement).classList.contains(
                          "resize-handle",
                        )
                      )
                        return;

                      let newSort = quickClone(mySort);
                      if (!newSort) {
                        if (isObject(col.sortable)) {
                          const [col1, col2] =
                            col.sortable.column.nested?.columns.filter(
                              (c) => c.show,
                            ) ?? [];
                          const onlyOneActiveColumn = col1 && !col2;
                          if (onlyOneActiveColumn) {
                            newSort = getDefaultSort(`${col.key}.${col1.name}`); // { key: `${col.key}.${onlyOneActiveColumn.name}`, asc: true };
                          } else {
                            this.setState({
                              showNestedSortOptions: {
                                anchorEl: e.currentTarget,
                                ...col.sortable,
                              },
                            });
                            return;
                          }
                        } else {
                          newSort = getDefaultSort(col.key as string);
                        }
                      } else if (newSort.asc) newSort.asc = false;
                      else newSort = undefined;
                      onSort(
                        (e.shiftKey ?
                          sort.filter(
                            (s) => s.key !== col.key && s.key !== mySort?.key,
                          )
                        : []
                        ).concat(newSort ? [newSort] : []),
                      );
                    }
                }
              >
                <div
                  className={
                    "flex-row fs-1 h-fit " +
                    (!col.sortable ? ""
                    : typeof mySort?.asc !== "boolean" ? " sort-none "
                    : [false].includes(mySort.asc as any) ? "sort-desc"
                    : "sort-asc") +
                    (col.headerClassname || "")
                  }
                >
                  <div className="flex-col min-w-0 f-shrink">
                    <div
                      title={
                        col.title ??
                        (typeof col.label === "string" ? col.label : undefined)
                      }
                      className="table-column-label text-ellipsis "
                    >
                      {col.label}
                    </div>
                    {col.subLabel !== undefined && this.props.showSubLabel ?
                      <div
                        className="table-column-sublabel text-2 mt-p25 font-normal ws-nowrap text-ellipsis "
                        title={col.subLabelTitle}
                      >
                        {col.subLabel}
                      </div>
                    : null}
                  </div>
                </div>

                {iCol <= cols.length - 1 ?
                  <Pan
                    className="resize-handle noselect"
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: "30px",
                      cursor: "ew-resize",
                      zIndex: 1,
                      marginRight: iCol === cols.length - 1 ? 0 : "-15px",
                    }}
                    onDoubleTap={(_, __, node) => {
                      const tableBody = node.closest(`.table-component`);
                      const colh: HTMLDivElement | null = node.closest(
                        `[role="columnheader"]`,
                      );
                      if (colh && col.onResize && tableBody) {
                        const [firstNode, ...otherRowNodes] =
                          tableBody.querySelectorAll<HTMLElement>(
                            `div[role="rowgroup"] [role="row"] > *:nth-child(${iCol + 1})`,
                          );
                        if (firstNode) {
                          const font = window.getComputedStyle(firstNode).font;
                          const max = [firstNode, ...otherRowNodes].reduce(
                            (a, n) =>
                              Math.max(
                                a,
                                getTextWidth(
                                  n.innerText.split("\n")[0] ?? "",
                                  font,
                                ),
                              ),
                            9,
                          );
                          const newWidth = Math.min(
                            document.body.offsetWidth / 2,
                            Math.max(30, max + 20),
                          );
                          col.onResize(newWidth);
                        }
                      }
                    }}
                    threshold={0}
                    onPanStart={(opts, ev) => {
                      const colh: HTMLDivElement | null = opts.node.closest(
                        `[role="columnheader"]`,
                      );
                      if (colh) {
                        (opts.node as any)._w = colh.offsetWidth;
                        // ev.target._flex = +colh.style.flex;
                      }
                    }}
                    onPan={(opts, ev) => {
                      const colh: HTMLDivElement | null = opts.node.closest(
                        `[role="columnheader"]`,
                      );
                      if (colh) {
                        const { xDiff } = opts;
                        const w_px = Math.max(
                          30,
                          (opts.node as any)._w + xDiff,
                        );
                        colh.style.width = `${w_px}px`;
                        colh.style.flex = "none";

                        const tableBody =
                          this.props.rootRef?.querySelector(
                            `[role="rowgroup"]`,
                          );
                        const rowCols =
                          tableBody?.querySelectorAll<HTMLElement>(
                            `[role="row"] > *:nth-child(${iCol + 1})`,
                          );
                        rowCols?.forEach((rc) => {
                          rc.style.width = `${w_px}px`;
                          rc.style.flex = "none";
                        });
                      }
                    }}
                    onPanEnd={(opts, ev) => {
                      const colh: HTMLDivElement | null = opts.node.closest(
                        `[role="columnheader"]`,
                      );
                      if (colh && col.onResize) {
                        col.onResize(colh.offsetWidth);
                      }
                    }}
                    onPress={(ev) => {
                      const colh = (ev.target as HTMLElement).closest(
                        `[role="columnheader"]`,
                      );
                      if (colh) {
                        colh.classList.toggle("resizing-ew", true);
                        vibrateFeedback(15);
                        ev.preventDefault();
                        ev.stopPropagation();
                      }
                    }}
                    onRelease={(ev) => {
                      const colh = (ev.target as HTMLElement).closest(
                        `[role="columnheader"]`,
                      );
                      if (colh) {
                        colh.classList.toggle("resizing-ew", false);
                      }
                    }}
                  />
                : null}
              </div>
            );
          })}
        </div>
      </>
    );
  }
}

export const getDraggedTableColStyle = (
  col: ProstglesColumn,
  iCol?: number,
  draggedCol?: TableState["draggedCol"],
): React.CSSProperties => {
  const result: React.CSSProperties =
    col.width ?
      {
        flex: "none",
        width: `${col.width}px`,
        // minWidth: `${col.width}px`
      }
    : { flex: 1 }; // width: "100px", minWidth: "100px"

  if (iCol !== undefined && draggedCol?.idx === iCol) {
    result.opacity = 0.5;
  }
  if (iCol !== undefined && draggedCol?.targetIdx === iCol) {
    // result.transition = ".3s all";
    result.paddingLeft = "2em";
    result.background = "var(--blue-100)";
  }

  return result;
};

function iosContextMenuPolyfill(): {
  onTouchStart: React.TouchEventHandler<HTMLDivElement>;
  onTouchMove: React.TouchEventHandler<HTMLDivElement>;
  onTouchEnd: React.TouchEventHandler<HTMLDivElement>;
} {
  const stop: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (window.isIOSDevice) {
      const element: any = e.currentTarget;
      if (element._isPressed) {
        clearTimeout(element._isPressed);
      }
      element._isPressed = null;
    }
  };

  return {
    onTouchStart: (e) => {
      if (window.isIOSDevice) {
        const element: any = e.currentTarget;
        e.preventDefault();
        element._isPressed = setTimeout(() => {
          // const element = e.currentTarget;
          if ((element as any)._isPressed) {
            const ev3 = new MouseEvent("contextmenu", {
              bubbles: true,
              cancelable: false,
              view: window,
              button: 2,
              buttons: 0,
              clientX: element.getBoundingClientRect().x,
              clientY: element.getBoundingClientRect().y,
            });
            element.dispatchEvent(ev3);
          }
        }, 500);
      }
    },
    onTouchMove: stop,
    onTouchEnd: stop,
  };
}

const getTextWidth = (text: string, font: string) => {
  // Create a canvas element
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return text.length * 10;
  }

  // Set the font
  context.font = font;

  // Measure the text width
  const metrics = context.measureText(text);
  return metrics.width;
};
