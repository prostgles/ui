import { matchObj } from "@common/utils";
import { FlexCol } from "@components/Flex";
import React, { useMemo } from "react";
import type { DBSchemaTableWJoins } from "../../../Dashboard/dashboardUtils";
import type { CardViewProps, IndexedRow } from "../CardView";
import type { CardViewState } from "../useCardViewState";
import { CardBody } from "./CardItemBody";
import { CardHeader } from "./CardItemHeader";

const marginTop = ".5em";

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

export const CardViewRow = (props: CardViewRowProps) => {
  const {
    props: { activeRow, activeRowColor, joinFilter, onClickRow },
    indexedRow,
    cardOpts,
    table,
    indexedRows,
    rowIndex,
    cols,
    w,
    draggedRow,
  } = props;

  const {
    cardRows = 1,
    hideCardFieldNames,
    maxCardWidth = "min(700px, 100%)",
    hideEmptyCardCells = true,
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
      cols.filter((c) => {
        const headerFields = [
          table.card?.headerColumn,
          table.card?.subHeaderColumn,
          table.card?.avatarColumn,
        ];
        if (headerFields.includes(c.name)) {
          return false;
        }
        return (
          !c.hidden &&
          !(
            hideEmptyCardCells &&
            [null, undefined, ""].includes(`${row[c.name] ?? ""}`.trim())
          )
        );
      }),
    [
      cols,
      hideEmptyCardCells,
      row,
      table.card?.avatarColumn,
      table.card?.headerColumn,
      table.card?.subHeaderColumn,
    ],
  );

  return (
    <FlexCol
      data-command="CardView.row"
      key={indexedRow.index}
      data-row-index={indexedRow.index}
      className={
        "CardView_Item relative card jc-start ai-stretch f-0 min-w-0 " +
        (cardRows > 1 ? " fit " : "")
      }
      style={style}
      onClick={(e) => {
        if (window.getSelection()?.toString()) return;
        onClickRow?.(row, e);
      }}
    >
      <CardHeader {...props} />
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
