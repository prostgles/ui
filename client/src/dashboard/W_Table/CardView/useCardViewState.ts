import { useMemo, useState } from "react";
import type { CardViewProps, IndexedRow } from "./CardView";
import type { KanBanDraggedRow } from "./CardViewRow";

export const useCardViewState = (_props: CardViewProps) => {
  const { props, state, w, cardOpts } = _props;
  const { rows: _rows = [] } = state;
  const [draggedRow, setDraggedRow] = useState<KanBanDraggedRow | undefined>();
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

  const { cardGroupBy } = cardOpts;

  const { columns = [] } = table ?? {};
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

  return {
    allIndexedRows,
    table,
    draggedRow,
    setDraggedRow,
    groupByColumn,
    moveItemsProps,
    cardGroupBy,
  };
};

export type CardViewState = ReturnType<typeof useCardViewState>;
