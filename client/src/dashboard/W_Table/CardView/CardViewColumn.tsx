import React from "react";
import type { DBSchemaTableWJoins } from "src/dashboard/Dashboard/dashboardUtils";
import type { CardViewProps, IndexedRow } from "./CardView";
import { CardViewRow } from "./CardViewRow";
import type { CardViewState } from "./useCardViewState";

export type CardViewColumnProps = Pick<
  CardViewProps,
  | "props"
  | "state"
  | "w"
  | "onEditClickRow"
  | "onDataChanged"
  | "cols"
  | "cardOpts"
  | "tableHandler"
> &
  Pick<
    CardViewState,
    "moveItemsProps" | "draggedRow" | "setDraggedRow" | "allIndexedRows"
  > & {
    indexedRows: IndexedRow[];
    table: DBSchemaTableWJoins;
  };

export const CardViewColumn = (_props: CardViewColumnProps) => {
  const {
    props,
    state,
    w,
    onEditClickRow,
    onDataChanged,
    cols,
    cardOpts,
    tableHandler,
    indexedRows,
    table,
    draggedRow,
    setDraggedRow,
    moveItemsProps,
    allIndexedRows,
  } = _props;
  const { rows: _rows = [] } = state;

  const { cardRows = 1 } = cardOpts;

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
      {indexedRows.map((indexedRow, rowIndex) => {
        return (
          <CardViewRow
            key={indexedRow.index}
            indexedRow={indexedRow}
            rowIndex={rowIndex}
            cardOpts={cardOpts}
            indexedRows={indexedRows}
            onDataChanged={onDataChanged}
            onEditClickRow={onEditClickRow}
            props={props}
            table={table}
            tableHandler={tableHandler}
            cols={cols}
            draggedRow={draggedRow}
            setDraggedRow={setDraggedRow}
            w={w}
            moveItemsProps={moveItemsProps}
            allIndexedRows={allIndexedRows}
          />
        );
      })}
    </div>
  );
};
