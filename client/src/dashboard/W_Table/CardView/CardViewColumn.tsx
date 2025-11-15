import React from "react";
import type { CardViewProps, IndexedRow } from "./CardView";
import { CardViewRow, type KanBanDraggedRow } from "./CardViewRow";
import type { DBSchemaTableWJoins } from "src/dashboard/Dashboard/dashboardUtils";

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
  } = _props;
  const { rows: _rows = [] } = state;

  const { cardRows = 1 } = cardOpts;

  const [draggedRow, setDraggedRow] = React.useState<
    KanBanDraggedRow | undefined
  >();

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
          />
        );
      })}
    </div>
  );
};
