import type { AnyObject } from "prostgles-types";
import { _PG_date } from "prostgles-types";
import React from "react";
import type { PaginationProps } from "../../components/Table/Pagination";
import { Pagination } from "../../components/Table/Pagination";
import type { WindowSyncItem } from "../Dashboard/dashboardUtils";
import RTComp from "../RTComp";
import SmartFormField from "../SmartForm/SmartFormField/SmartFormField";
import type { W_TableProps, W_TableState } from "./W_Table";
import type { OnClickEditRow } from "./tableUtils/getEditColumn";
import { getEditColumn } from "./tableUtils/getEditColumn";
import { DragHeader, DragHeaderHeight } from "./DragHeader";
import type { ProstglesTableColumn } from "./tableUtils/getTableCols";
import { FlexCol, FlexRowWrap } from "../../components/Flex";
import { matchObj } from "../../../../commonTypes/utils";

export type CardViewProps = {
  props: W_TableProps;
  state: W_TableState;
  w?: WindowSyncItem<"table">;
  paginationProps: PaginationProps;
  style?: React.CSSProperties;
  className?: string;
  onEditClickRow: OnClickEditRow;
  onDataChanged: VoidFunction;
  cols: ProstglesTableColumn[];
};

export type CardViewState = {
  isMoving?: {
    top: number;
    left: number;
    height: number;
    data: AnyObject;
    index: number;
    bbox: DOMRect;
    target?: {
      data: AnyObject;
      index: number;
    };
  };
};

export type IndexedRow = {
  data: AnyObject;
  index: number;
};

export class CardView extends RTComp<CardViewProps, CardViewState> {
  state: CardViewState = {};

  render() {
    const {
      props,
      state,
      w,
      paginationProps,
      className = "",
      style,
      onEditClickRow,
      onDataChanged,
      cols,
    } = this.props;
    const { rows: _rows = [] } = state;
    const { isMoving } = this.state;
    const rows = _rows.map((data, index) => ({ data, index }));
    const { joinFilter, activeRowColor, activeRow, prgl, tables } = props;
    const tableHandler = prgl.db[w!.table_name!];
    const columns = tables.find((t) => t.name === w?.table_name)?.columns;
    if (!columns) {
      return <div>Cols missing</div>;
    }
    if (!tableHandler) {
      return <div>db.{w?.table_name} tableHandler missing</div>;
    }

    const cardOpts =
      w?.options.viewAs?.type === "card" ? w.options.viewAs : undefined;
    if (!cardOpts) return null;

    const groupByColumn = columns.find(
      (c) => c.name === cardOpts.cardGroupBy && c.update,
    );
    const moveItemsProps =
      groupByColumn ?
        {
          groupByColumn,
          orderByColumn: columns.find((c) => c.name === cardOpts.cardOrderBy),
        }
      : undefined;

    const {
      cardRows = 1,
      hideCardFieldNames,
      maxCardWidth = "100%",
      hideEmptyCardCells,
      maxCardRowHeight,
      cardCellMinWidth = "",
      cardGroupBy,
    } = cardOpts;
    const marginRight = cardRows > 1 ? `.5em` : "auto";
    const marginTop = ".5em";
    const marginLeftRight =
      cardRows === 1 && maxCardWidth !== "100%" ? "auto" : "";

    const getActiveRowStyle = (row: AnyObject): React.CSSProperties => {
      let activeRowStyle: React.CSSProperties = {};
      if (joinFilter || (activeRow && matchObj(activeRow.row_filter, row))) {
        activeRowStyle = {
          boxShadow: `inset 0 0 10px ${activeRowColor}`,
        };
      }
      return activeRowStyle;
    };

    const getCardColumn = (indexedRows: IndexedRow[]) => {
      const padding = !window.isMobileDevice ? "1em" : ".5em";

      return (
        <div
          className={
            "CardView_Column" +
            (cardRows > 1 ? " flex-row-wrap " : " flex-col ") +
            " p-p25 o-auto no-scroll-bar f-1 min-w-0 min-h-0 px-p5 pt-p5"
          }
          style={{
            placeContent: cardRows > 1 ? "flex-start" : undefined,
          }}
        >
          {indexedRows.map((indexedRow, ri) => {
            const row = indexedRow.data;

            const itemMarginTop =
              isMoving && indexedRow.index === isMoving.index + 1 ?
                `calc(${isMoving.height}px + 1em)`
              : marginTop;
            const isDragTarget =
              this.state.isMoving?.target?.index === indexedRow.index;
            return (
              <FlexRowWrap
                key={indexedRow.index}
                data-row-index={indexedRow.index}
                data-command="CardView.row"
                className={
                  "CardView_Item relative card jc-start f-0 min-w-0 " +
                  (cardRows > 1 ? " fit " : "")
                }
                style={{
                  gap: padding,
                  background:
                    isDragTarget ? "var(--blue-100)" : "var(--bg-color-0)",
                  padding,
                  /** Used to ensure top right edit button is visible */
                  paddingRight: "3em",
                  /** Used to ensure cell header contextmenu is working */
                  paddingTop: `${DragHeaderHeight}px`,
                  ...(maxCardWidth !== "100%" ?
                    {
                      width: maxCardWidth,
                    }
                  : {
                      width:
                        cardRows > 1 ? `calc(${99 / cardRows}% - .5em)` : "",
                    }),
                  margin: `${itemMarginTop} ${marginRight} 0 ${marginLeftRight}`,
                  ...getActiveRowStyle(row),
                }}
                onClick={(e) => {
                  if (window.getSelection()?.toString()) return;
                  props.onClickRow?.(row, e);
                }}
              >
                {moveItemsProps && (
                  <DragHeader
                    {...moveItemsProps}
                    padding={padding}
                    tableHandler={tableHandler}
                    isMoving={this.state.isMoving}
                    onChange={(isMoving) => {
                      this.setState({ isMoving });
                    }}
                    allIndexedRows={rows}
                    columns={columns}
                    onDataChanged={onDataChanged}
                    onEditClickRow={onEditClickRow}
                    indexedRow={indexedRow}
                  />
                )}
                {!w?.options.hideEditRow && (
                  <div
                    style={{
                      top: "2px",
                      right: "2px",
                      position: "absolute",
                    }}
                  >
                    {getEditColumn({
                      columns,
                      tableHandler,
                      onClickRow: (...args) => {
                        if (this.state.isMoving) return;
                        onEditClickRow(...args);
                      },
                    }).onRender!({
                      value: "",
                      renderedVal: "",
                      row,
                      prevRow: rows[ri - 1],
                      nextRow: rows[ri + 1],
                      rowIndex: ri,
                    })}
                  </div>
                )}

                {cols
                  .filter(
                    (c) =>
                      !c.hidden &&
                      !(
                        hideEmptyCardCells &&
                        [null, undefined, ""].includes(
                          `${row[c.name] ?? ""}`.trim(),
                        )
                      ),
                  )
                  .map((c, ci) => (
                    <div
                      key={ci}
                      title={c.udt_name}
                      className={
                        "flex-col min-w-0 " +
                        (cardRows > 1 ? " h-fit w-fit " : "")
                      }
                      style={{ minWidth: cardCellMinWidth }}
                    >
                      {!hideCardFieldNames && (
                        <div
                          className=" text-2 pointer noselect"
                          onContextMenu={c.onContextMenu as any}
                        >
                          {c.name}
                        </div>
                      )}
                      <div
                        className=" o-auto font-18"
                        title={
                          (
                            typeof row[c.name] === "string" &&
                            (_PG_date.some((v) => v === c.udt_name) ||
                              c.tsDataType === "number")
                          ) ?
                            row[c.name]
                          : ""
                        }
                        style={{
                          lineHeight: 1.33,
                          ...(c.getCellStyle?.(row, row[c.name], row[c.name]) ||
                            {}),
                          maxHeight: `${maxCardRowHeight || 800}px`,
                        }}
                      >
                        {c.onRender?.({
                          row: row,
                          value: row[c.name],
                          renderedVal: row[c.name],
                          rowIndex: ri,
                          nextRow: rows[ri + 1],
                          prevRow: rows[ri - 1],
                        }) ?? SmartFormField.renderValue(c, row[c.name])}
                      </div>
                    </div>
                  ))}
              </FlexRowWrap>
            );
          })}
        </div>
      );
    };

    let content: React.ReactNode = null;

    /** Kanban. Maintain order */
    if (cardGroupBy) {
      const groupByColumn = cardGroupBy;
      const columnGroups = Array.from(
        new Set(rows.map(({ data }) => data[groupByColumn])),
      );
      content = (
        <div className="flex-row f-1 min-s-0 mt-1 o-auto">
          {columnGroups.map((groupByValue) => {
            let groupRows = rows.filter(
              ({ data }) => data[groupByColumn] === groupByValue,
            );
            if (cardOpts.cardOrderBy) {
              const orderByColumn = cardOpts.cardOrderBy;
              groupRows = groupRows.sort((a, b) => {
                const aVal = a.data[orderByColumn];
                const bVal = b.data[orderByColumn];
                return aVal - bVal;
              });
            }
            return (
              <FlexCol
                key={groupByValue}
                data-key={groupByValue}
                className="gap-0"
                data-command="CardView.group"
              >
                <div
                  title={groupByColumn}
                  className="f-0 p-p5 px-1 font-18"
                  style={{
                    fontWeight: 700,
                  }}
                >
                  {groupByValue}
                </div>
                <div className="min-s-0 o-auto f-1">
                  {getCardColumn(groupRows)}
                </div>
              </FlexCol>
            );
          })}
        </div>
      );
    } else {
      content = getCardColumn(rows);
    }

    return (
      <div
        className={
          "CardView o-auto min-s-0 flex-col f-1 bg-color-2  " + className
        }
        style={style}
      >
        {content}
        <Pagination {...paginationProps} />
      </div>
    );
  }
}
