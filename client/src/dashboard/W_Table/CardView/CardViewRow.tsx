import { matchObj } from "@common/utils";
import { FlexCol, FlexRow, FlexRowWrap } from "@components/Flex";
import { _PG_date, isDefined, type AnyObject } from "prostgles-types";
import React, { useMemo } from "react";
import type { CardLayout } from "src/dashboard/Dashboard/cardLayout";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";
import { RenderValue } from "../../SmartForm/SmartFormField/RenderValue";
import { getEditColumn } from "../tableUtils/getEditColumn";
import type { CardViewProps, IndexedRow } from "./CardView";
import { DragHeader } from "./DragHeader";
import type { CardViewState } from "./useCardViewState";
import { RenderMedia } from "@components/MediaViewer/RenderMedia";
import { MediaViewer } from "@components/MediaViewer/MediaViewer";

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
      gap: 0,
      padding: 0,
      background: isDragTarget ? "var(--bg-li-selected)" : "var(--bg-color-0)",
      // padding,
      // /** Used to ensure top right edit button is visible */
      // paddingRight: "3em",
      /** Used to ensure cell header contextmenu is working */
      // paddingTop: `${DragHeaderHeight}px`,
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
          ) &&
          table.card?.headerColumn !== c.name,
      ),
    [cols, hideEmptyCardCells, row, table.card?.headerColumn],
  );

  const { card } = table;
  const headerColumn =
    card?.headerColumn ?
      table.columns.find((c) => c.name === card.headerColumn)
    : undefined;

  const subHeaderColumn =
    card?.subHeaderColumn ?
      table.columns.find((c) => c.name === card.subHeaderColumn)
    : undefined;

  const avatarColumn =
    card?.avatarColumn ?
      table.columns.find((c) => c.name === card.avatarColumn)
    : undefined;

  const avatarUrl =
    avatarColumn && typeof row[avatarColumn.name] === "string" ?
      (row[avatarColumn.name] as string)
    : undefined;

  return (
    <FlexCol
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
      <FlexRow
        className="CardHeader relative w-full ai-start"
        style={{ gap: padding, paddingLeft: avatarUrl ? padding : undefined }}
      >
        {avatarUrl && (
          <MediaViewer
            style={{
              flex: "none",
              width: "3em",
              height: "3em",
              borderRadius: "50%",
              overflow: "hidden",
              alignSelf: "center",
              border: "1px solid var(--b-color)",
            }}
            url={avatarUrl}
            content_type="image"
          />
        )}
        <FlexCol
          className="w-full f-1 gap-p25"
          style={{
            padding,
            ...(avatarUrl ?
              {
                paddingLeft: 0,
              }
            : {}),
          }}
        >
          {headerColumn && (
            <div
              className="w-full f-1"
              title={headerColumn.label || headerColumn.name}
              style={{
                fontWeight: "bold",
                fontSize: "1.1em",
              }}
            >
              <RenderValue
                column={headerColumn}
                value={row[headerColumn.name]}
              />
            </div>
          )}
          {subHeaderColumn && (
            <div
              className="w-full f-1 text-1"
              title={subHeaderColumn.label || subHeaderColumn.name}
              style={{
                fontSize: "0.9em",
              }}
            >
              <RenderValue
                column={subHeaderColumn}
                value={row[subHeaderColumn.name]}
              />
            </div>
          )}
        </FlexCol>
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
        {!w?.options.hideEditRow &&
          getEditColumn({
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
      </FlexRow>
      <CardBody
        visibleCols={visibleCols}
        cardCellMinWidth={cardCellMinWidth}
        cardRows={cardRows}
        row={row}
        hideCardFieldNames={hideCardFieldNames}
        maxCardRowHeight={maxCardRowHeight}
        rowIndex={rowIndex}
        indexedRows={indexedRows}
        cardLayout={w?.options.cardLayout}
        table={table}
      />
    </FlexCol>
  );
};

const CardBody = ({
  visibleCols,
  cardCellMinWidth,
  cardRows,
  row,
  hideCardFieldNames,
  maxCardRowHeight,
  rowIndex,
  indexedRows,
  cardLayout,
  table,
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
  table: DBSchemaTableWJoins;
}) => {
  const { visibleColumns = visibleCols.map((c) => c.name) } = table.card ?? {};
  const columnNodeList = visibleColumns
    .map((c) => {
      const columnName = typeof c === "string" ? c : c.column;
      return visibleCols.find((vc) => vc.name === columnName);
    })
    .filter(isDefined)
    .map((c, ci) => {
      const value = row[c.name] as unknown;
      const renderedVal = <RenderValue column={c} value={value} />;
      return (
        <div
          key={ci}
          title={c.udt_name}
          className={
            "flex-col gap-p25 min-w-0 " + (cardRows > 1 ? " h-fit w-fit " : "")
          }
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
              {c.label || c.name}
            </div>
          )}
          <div
            className=" o-auto "
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
              renderedVal,
              rowIndex: rowIndex,
              nextRow: indexedRows[rowIndex + 1],
              prevRow: indexedRows[rowIndex - 1],
            }) ?? renderedVal}
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

  return (
    <FlexRowWrap
      className={"CardBody jc-start ai-start f-0 min-w-0"}
      style={{
        gap: padding,
        padding,
        paddingTop: 0,
      }}
    >
      {columnNodeList}
    </FlexRowWrap>
  );
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
