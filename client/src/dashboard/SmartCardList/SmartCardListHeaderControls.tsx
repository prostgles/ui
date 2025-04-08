import { getKeys, isObject, type ValidatedColumnInfo } from "prostgles-types";
import React, { useMemo } from "react";
import { FlexRowWrap } from "../../components/Flex";
import { SmartSearch } from "../SmartFilter/SmartSearch/SmartSearch";
import SortByControl from "../SmartFilter/SortByControl";
import { InsertButton } from "../SmartForm/InsertButton";
import type { SmartCardListProps } from "./SmartCardList";
import type { SmartCardListState } from "./useSmartCardListState";
import { SmartFilterBar } from "../SmartFilterBar/SmartFilterBar";
import type { ColumnSort } from "../W_Table/ColumnMenu/ColumnMenu";

export const SmartCardListHeaderControls = (
  props: SmartCardListProps & {
    totalRows: number | undefined;
    itemsLength: number | undefined;
    columns: ValidatedColumnInfo[];
    state: ReturnType<typeof useSmartCardListControls>;
  } & Pick<SmartCardListState, "tableControls">,
) => {
  const {
    title,
    totalRows,
    db,
    tables,
    methods,
    columns,
    state,
    tableControls,
  } = props;
  if (!state) return null;
  const { sorting, insertTableName } = state;

  return (
    <FlexRowWrap
      className="SmartCardListControls gap-p5 ai-end py-p25"
      style={{ justifyContent: "space-between" }}
    >
      {typeof title === "string" ?
        <h4 className="m-0">{title}</h4>
      : typeof title === "function" ?
        title({ count: totalRows ?? -1 })
      : title}

      {sorting && (
        <>
          <SortByControl
            btnProps={
              props.btnColor === "gray" ?
                { color: "default", variant: "faded" }
              : {}
            }
            fields={sorting.orderByFields ?? undefined}
            columns={columns}
            value={sorting.orderBy}
            onChange={sorting.setOrderBy}
          />
        </>
      )}

      {tableControls && (
        <SmartFilterBar
          className="p-1 bg-color-2 min-h-fit"
          rowCount={totalRows ?? 0}
          db={db}
          methods={{}}
          table_name={tableControls.tableName}
          tables={tables}
          filter={tableControls.localFilter}
          onChange={(filter) => {
            tableControls.setLocalFilter(filter);
          }}
          onHavingChange={() => {
            console.warn("Having change not implemented");
          }}
          // sort={sorting?.orderBy}
          onSortChange={sorting?.setOrderBy}
        />
        // <SmartSearch
        //   db={db}
        //   tableName={tableControls.tableName}
        //   tables={tables}
        //   onChange={(maybeFilter) => {
        //     tableControls.setLocalFilter(maybeFilter?.filter);
        //   }}
        //   selectedColumns={columns}
        //   extraFilters={[]}
        // />
      )}

      {insertTableName && (
        <InsertButton
          buttonProps={{
            children: "Add",
          }}
          db={db}
          tables={tables}
          methods={methods}
          tableName={insertTableName}
        />
      )}
    </FlexRowWrap>
  );
};

export const useSmartCardListControls = (
  props: SmartCardListProps & {
    totalRows: number | undefined;
    columns: ValidatedColumnInfo[];
    stateOrderBy: ColumnSort | undefined;
    setOrderBy: (orders: ColumnSort | undefined) => void;
  },
) => {
  const {
    title,
    tableName,
    showTopBar, // = (itemsLength ?? 0) > 30,
    tables,
    stateOrderBy,
    setOrderBy,
  } = props;

  const dataInProps = "data" in props;
  const orderByFields = dataInProps ? undefined : props.orderByfields;

  const showSort = useMemo(() => {
    const showSort = isObject(showTopBar) ? showTopBar.sort : showTopBar;
    if (dataInProps || !showSort || orderByFields?.length === 0) return;
    return true;
  }, [showTopBar, dataInProps, orderByFields]);

  const { table, insertTableName } = useMemo(() => {
    const showInsert = isObject(showTopBar) ? showTopBar.insert : showTopBar;
    const table =
      typeof tableName === "string" ?
        tables.find((t) => t.name === tableName)
      : undefined;

    const willShowInsert =
      showInsert &&
      typeof tableName === "string" &&
      !dataInProps &&
      table?.columns.some((c) => c.insert);
    return {
      insertTableName: willShowInsert ? tableName : undefined,
      table,
    };
  }, [tableName, tables, dataInProps, showTopBar]);

  if (!title && !showTopBar) return undefined;

  return {
    table,
    sorting:
      showSort ?
        { orderBy: stateOrderBy, setOrderBy: setOrderBy, orderByFields }
      : undefined,
    insertTableName,
    title,
  };
};
