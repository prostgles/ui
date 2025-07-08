import { _PG_date } from "prostgles-types";
import React, { useMemo } from "react";
import { matchObj } from "../../../../../commonTypes/utils";
import { FlexRowWrap } from "../../../components/Flex";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";
import { RenderValue } from "../../SmartForm/SmartFormField/RenderValue";
import { getEditColumn } from "../tableUtils/getEditColumn";
import type { CardViewProps, IndexedRow } from "./CardView";
import { DragHeader, DragHeaderHeight } from "./DragHeader";

export type CardViewRowProps = Pick<
  CardViewProps,
  | "props"
  | "cardOpts"
  | "onEditClickRow"
  | "tableHandler"
  | "onDataChanged"
  | "cols"
  | "w"
> & {
  indexedRow: IndexedRow;
  rowIndex: number;
  indexedRows: IndexedRow[];
  table: DBSchemaTableWJoins;
  draggedRow: KanBanDraggedRow | undefined;
  setDraggedRow: React.Dispatch<
    React.SetStateAction<KanBanDraggedRow | undefined>
  >;
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
}: CardViewRowProps) => {
  const columns = table.columns;

  const groupByColumn = columns.find(
    (c) => c.name === cardOpts.cardGroupBy && c.update,
  );
  const moveItemsProps = useMemo(
    () =>
      groupByColumn ?
        {
          groupByColumn,
          orderByColumn: columns.find((c) => c.name === cardOpts.cardOrderBy),
        }
      : undefined,
    [cardOpts.cardOrderBy, columns, groupByColumn],
  );
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
          allIndexedRows={indexedRows}
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

      {cols
        .filter(
          (c) =>
            !c.hidden &&
            !(
              hideEmptyCardCells &&
              [null, undefined, ""].includes(`${row[c.name] ?? ""}`.trim())
            ),
        )
        .map((c, ci) => (
          <div
            key={ci}
            title={c.udt_name}
            className={
              "flex-col min-w-0 " + (cardRows > 1 ? " h-fit w-fit " : "")
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
                ...(c.getCellStyle?.(row, row[c.name], row[c.name]) || {}),
                maxHeight: `${maxCardRowHeight || 800}px`,
              }}
            >
              {c.onRender?.({
                row: row,
                value: row[c.name],
                renderedVal: row[c.name],
                rowIndex: rowIndex,
                nextRow: indexedRows[rowIndex + 1],
                prevRow: indexedRows[rowIndex - 1],
              }) ?? <RenderValue column={c} value={row[c.name]} />}
            </div>
          </div>
        ))}
    </FlexRowWrap>
  );
};

const marginTop = ".5em";
const padding = !window.isMobileDevice ? "1em" : ".5em";
