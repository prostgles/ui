import type { PaginationProps } from "@components/Table/Pagination";
import { Pagination } from "@components/Table/Pagination";
import type { TableHandlerClient } from "prostgles-client/dist/prostgles";
import type { AnyObject } from "prostgles-types";
import React, { useMemo } from "react";
import type {
  ChartOptions,
  WindowSyncItem,
} from "../../Dashboard/dashboardUtils";
import type { W_TableProps, W_TableState } from "../W_Table";
import type { OnClickEditRow } from "../tableUtils/getEditColumn";
import type { ProstglesTableColumn } from "../tableUtils/getTableCols";
import { CardViewColumn } from "./CardViewColumn";
import { CardViewKanban } from "./CardViewKanban";

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
  const {
    props,
    state,
    w,
    paginationProps,
    className = "",
    style,
    cardOpts,
  } = _props;
  const { rows: _rows = [] } = state;

  const { allIndexedRows, table } = useMemo(() => {
    const allIndexedRows: IndexedRow[] = _rows.map((data, index) => ({
      data,
      index,
    }));
    const { tables } = props;
    const table = tables.find((t) => t.name === w?.table_name);
    return {
      allIndexedRows,
      table,
    };
  }, [_rows, props, w?.table_name]);

  if (!table) {
    return <div>Table info missing</div>;
  }

  const { cardGroupBy } = cardOpts;

  return (
    <div
      className={
        "CardView o-auto min-s-0 flex-col f-1 bg-color-2  " + className
      }
      style={style}
    >
      {cardGroupBy ?
        <CardViewKanban
          {..._props}
          cardOpts={{ ...cardOpts, cardGroupBy }}
          allIndexedRows={allIndexedRows}
          table={table}
        />
      : <CardViewColumn
          {..._props}
          table={table}
          indexedRows={allIndexedRows}
        />
      }
      <Pagination {...paginationProps} />
    </div>
  );
};
