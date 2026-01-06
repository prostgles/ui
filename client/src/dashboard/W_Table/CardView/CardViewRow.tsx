import type { CardLayout } from "@common/DashboardTypes";
import { matchObj } from "@common/utils";
import { FlexRowWrap } from "@components/Flex";
import { _PG_date, type AnyObject } from "prostgles-types";
import React, { useMemo } from "react";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";
import { RenderValue } from "../../SmartForm/SmartFormField/RenderValue";
import { getEditColumn } from "../tableUtils/getEditColumn";
import type { CardViewProps, IndexedRow } from "./CardView";
import { DragHeader, DragHeaderHeight } from "./DragHeader";
import type { CardViewState } from "./useCardViewState";

export type CardViewRowProps = Pick<
  CardViewProps,
  | "props"
  | "cardOpts"
  | "onEditClickRow"
  | "tableHandler"
  | "onDataChanged"
  | "cols"
  | "w"
> &
  Pick<
    CardViewState,
    "moveItemsProps" | "draggedRow" | "setDraggedRow" | "allIndexedRows"
  > & {
    indexedRow: IndexedRow;
    rowIndex: number;
    indexedRows: IndexedRow[];
    table: DBSchemaTableWJoins;
  };

export type KanBanDraggedRow = IndexedRow & {
  height: number;
  target: IndexedRow | undefined;
};

export const CardViewRow = ({
  props: { activeRow, activeRowColor, joinFilter, onClickRow },
  indexedRow,
  cardOpts,
  onEditClickRow,
  tableHandler,
  table,
  onDataChanged,
  indexedRows,
  rowIndex,
  cols,
  w,
  draggedRow,
  setDraggedRow,
  moveItemsProps,
  allIndexedRows,
}: CardViewRowProps) => {
  const columns = table.columns;

  const {
    cardRows = 1,
    hideCardFieldNames,
    maxCardWidth = "100%",
    hideEmptyCardCells,
    maxCardRowHeight,
    cardCellMinWidth = "",
  } = cardOpts;
  const marginRight = cardRows > 1 ? `.5em` : "auto";
  const marginLeftRight =
    cardRows === 1 && maxCardWidth !== "100%" ? "auto" : "";
  const row = indexedRow.data;
  const isMoving = draggedRow;
  const itemMarginTop =
    isMoving && indexedRow.index === isMoving.index + 1 ?
      `calc(${isMoving.height}px + 1em)`
    : marginTop;
  const isDragTarget = isMoving?.target?.index === indexedRow.index;

  const style = useMemo(() => {
    const isActive =
      joinFilter || (activeRow && matchObj(activeRow.row_filter, row));
    return {
      gap: padding,
      background: isDragTarget ? "var(--bg-li-selected)" : "var(--bg-color-0)",
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
          width: cardRows > 1 ? `calc(${99 / cardRows}% - .5em)` : "",
        }),
      margin: `${itemMarginTop} ${marginRight} 0 ${marginLeftRight}`,
      ...(isActive && {
        boxShadow: `inset 0 0 10px ${activeRowColor}`,
      }),
    };
  }, [
    activeRow,
    activeRowColor,
    cardRows,
    isDragTarget,
    itemMarginTop,
    joinFilter,
    marginLeftRight,
    marginRight,
    maxCardWidth,
    row,
  ]);

  const visibleCols = useMemo(
    () =>
      cols.filter(
        (c) =>
          !c.hidden &&
          !(
            hideEmptyCardCells &&
            [null, undefined, ""].includes(`${row[c.name] ?? ""}`.trim())
          ),
      ),
    [cols, hideEmptyCardCells, row],
  );

  return (
    <FlexRowWrap
      data-command="CardView.row"
      key={indexedRow.index}
      data-row-index={indexedRow.index}
      className={
        "CardView_Item relative card jc-start ai-start f-0 min-w-0 " +
        (cardRows > 1 ? " fit " : "")
      }
      style={style}
      onClick={(e) => {
        if (window.getSelection()?.toString()) return;
        onClickRow?.(row, e);
      }}
    >
      {moveItemsProps && (
        <DragHeader
          {...moveItemsProps}
          padding={padding}
          tableHandler={tableHandler}
          table={table}
          allIndexedRows={allIndexedRows}
          columns={columns}
          onDataChanged={onDataChanged}
          onEditClickRow={onEditClickRow}
          indexedRow={indexedRow}
          draggedRow={draggedRow}
          setDraggedRow={setDraggedRow}
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
            table,
            columnConfig: w?.columns || undefined,
            tableHandler,
            onClickRow: (...args) => {
              if (draggedRow) return;
              onEditClickRow(...args);
            },
          }).onRender!({
            value: "",
            renderedVal: "",
            row,
            prevRow: indexedRows[rowIndex - 1],
            nextRow: indexedRows[rowIndex + 1],
            rowIndex: rowIndex,
          })}
        </div>
      )}
      <CardViewRowContent
        visibleCols={visibleCols}
        cardCellMinWidth={cardCellMinWidth}
        cardRows={cardRows}
        row={row}
        hideCardFieldNames={hideCardFieldNames}
        maxCardRowHeight={maxCardRowHeight}
        rowIndex={rowIndex}
        indexedRows={indexedRows}
        cardLayout={w?.options.cardLayout}
      />
    </FlexRowWrap>
  );
};

const CardViewRowContent = ({
  visibleCols,
  cardCellMinWidth,
  cardRows,
  row,
  hideCardFieldNames,
  maxCardRowHeight,
  rowIndex,
  indexedRows,
  cardLayout,
}: Pick<
  Required<CardViewRowProps["cardOpts"]>,
  "cardCellMinWidth" | "cardRows"
> & {
  visibleCols: CardViewRowProps["cols"];
  row: AnyObject;
  maxCardRowHeight: number | undefined;
  hideCardFieldNames: boolean | undefined;
  cardCellMinWidth: string;
  rowIndex: number;
  indexedRows: IndexedRow[];
  cardLayout: CardLayout | undefined;
}) => {
  const columnNodeList = visibleCols.map((c, ci) => {
    const value = row[c.name] as unknown;
    return (
      <div
        key={ci}
        title={c.udt_name}
        className={"flex-col min-w-0 " + (cardRows > 1 ? " h-fit w-fit " : "")}
        style={{ minWidth: cardCellMinWidth }}
      >
        {!hideCardFieldNames && (
          <div
            className=" text-2 pointer noselect"
            onContextMenu={
              c.onContextMenu &&
              ((e) => c.onContextMenu?.(e, e.currentTarget, c, () => {}))
            }
          >
            {c.name}
          </div>
        )}
        <div
          className=" o-auto font-18"
          title={
            (
              typeof value === "string" &&
              (_PG_date.some((v) => v === c.udt_name) ||
                c.tsDataType === "number")
            ) ?
              value
            : ""
          }
          style={{
            lineHeight: 1.33,
            ...(c.getCellStyle?.(row, value, value) || {}),
            maxHeight: `${maxCardRowHeight || 800}px`,
          }}
        >
          {c.onRender?.({
            row: row,
            value,
            renderedVal: value,
            rowIndex: rowIndex,
            nextRow: indexedRows[rowIndex + 1],
            prevRow: indexedRows[rowIndex - 1],
          }) ?? <RenderValue column={c} value={value} />}
        </div>
      </div>
    );
  });

  if (cardLayout) {
    const columnNodes: Record<string, React.ReactNode> = {};
    visibleCols.forEach((c, i) => {
      columnNodes[c.name] = columnNodeList[i];
    });
    return (
      <CardLayoutRenderer
        cardLayout={cardLayout}
        columnNodes={columnNodes}
        item={cardLayout}
      />
    );
  }

  return <>{columnNodeList}</>;
};

const CardLayoutRenderer = ({
  cardLayout,
  columnNodes,
  item,
}: {
  cardLayout: CardLayout;
  columnNodes: Record<string, React.ReactNode>;
  item: CardLayout["children"][number];
}) => {
  if (item.type === "node") {
    const node = columnNodes[item.columnName];
    if (!node) return <>Column node missing for {item.columnName}</>;
    return node;
  }

  return (
    <div style={item.style} data-node-type={item.type || "container"}>
      {item.children.map((childItem, index) => (
        <CardLayoutRenderer
          key={index}
          cardLayout={cardLayout}
          columnNodes={columnNodes}
          item={childItem}
        />
      ))}
    </div>
  );
};

const marginTop = ".5em";
const padding = !window.isMobileDevice ? "1em" : ".5em";
