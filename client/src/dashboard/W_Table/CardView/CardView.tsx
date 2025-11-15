import type { PaginationProps } from "@components/Table/Pagination";
import { Pagination } from "@components/Table/Pagination";
import type { TableHandlerClient } from "prostgles-client/dist/prostgles";
import type { AnyObject } from "prostgles-types";
import React from "react";
import type {
  ChartOptions,
  WindowSyncItem,
} from "../../Dashboard/dashboardUtils";
import type { W_TableProps, W_TableState } from "../W_Table";
import type { OnClickEditRow } from "../tableUtils/getEditColumn";
import type { ProstglesTableColumn } from "../tableUtils/getTableCols";
import { CardViewColumn } from "./CardViewColumn";
import { CardViewKanban } from "./CardViewKanban";
import { useCardViewState } from "./useCardViewState";

export type CardViewProps = {
  props: W_TableProps;
  state: W_TableState;
  cardOpts: Extract<ChartOptions<"table">["viewAs"], { type: "card" }>;
  w?: WindowSyncItem<"table">;
  tableHandler: Partial<TableHandlerClient<AnyObject, void>>;
  paginationProps: PaginationProps;
  style?: React.CSSProperties;
  className?: string;
  onEditClickRow: OnClickEditRow;
  onDataChanged: VoidFunction;
  cols: ProstglesTableColumn[];
};

export type IndexedRow = {
  data: AnyObject;
  index: number;
};

export const CardView = (_props: CardViewProps) => {
  const { state, paginationProps, className = "", style, cardOpts } = _props;
  const { rows: _rows = [] } = state;

  const cardViewState = useCardViewState(_props);
  const {
    table,
    groupByColumn,
    allIndexedRows,
    draggedRow,
    setDraggedRow,
    moveItemsProps,
  } = cardViewState;

  if (!table) {
    return <div>Table info missing</div>;
  }

  return (
    <div
      className={
        "CardView o-auto min-s-0 flex-col f-1 bg-color-2  " + className
      }
      style={style}
    >
      {groupByColumn ?
        <CardViewKanban
          key="kanban"
          {..._props}
          cardOpts={cardOpts}
          groupByColumn={groupByColumn}
          allIndexedRows={allIndexedRows}
          table={table}
          draggedRow={draggedRow}
          setDraggedRow={setDraggedRow}
          moveItemsProps={moveItemsProps}
        />
      : <CardViewColumn
          key="column"
          {..._props}
          table={table}
          indexedRows={allIndexedRows}
          draggedRow={draggedRow}
          setDraggedRow={setDraggedRow}
          moveItemsProps={moveItemsProps}
          allIndexedRows={allIndexedRows}
        />
      }
      <Pagination {...paginationProps} />
    </div>
  );
};
