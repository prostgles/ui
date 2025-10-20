import type { TableHandlerClient } from "prostgles-client/dist/prostgles";
import type { AnyObject } from "prostgles-types";
import React, { useMemo } from "react";
import { FlexCol } from "../../../components/Flex";
import type { PaginationProps } from "../../../components/Table/Pagination";
import { Pagination } from "../../../components/Table/Pagination";
import type {
  ChartOptions,
  WindowSyncItem,
} from "../../Dashboard/dashboardUtils";
import type { W_TableProps, W_TableState } from "../W_Table";
import type { OnClickEditRow } from "../tableUtils/getEditColumn";
import type { ProstglesTableColumn } from "../tableUtils/getTableCols";
import { CardViewRow, type KanBanDraggedRow } from "./CardViewRow";

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
    onEditClickRow,
    onDataChanged,
    cols,
    cardOpts,
    tableHandler,
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

  const [draggedRow, setDraggedRow] = React.useState<
    KanBanDraggedRow | undefined
  >();
  if (!table) {
    return <div>Table info missing</div>;
  }

  const { cardRows = 1, cardGroupBy } = cardOpts;

  const getCardColumn = (indexedRows: IndexedRow[]) => {
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
              indexedRows={allIndexedRows}
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

  let content: React.ReactNode = null;

  /** Kanban. Maintain order */
  if (cardGroupBy) {
    const groupByColumn = cardGroupBy;
    const columnGroups = Array.from(
      new Set(allIndexedRows.map(({ data }) => data[groupByColumn])),
    );
    content = (
      <div className="flex-row f-1 min-s-0 mt-1 o-auto">
        {columnGroups.map((groupByValue) => {
          let groupRows = allIndexedRows.filter(
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
    content = getCardColumn(allIndexedRows);
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
};
