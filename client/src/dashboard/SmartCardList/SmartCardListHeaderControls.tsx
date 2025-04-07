import { getKeys, isObject, type ValidatedColumnInfo } from "prostgles-types";
import React, { useMemo } from "react";
import { FlexRowWrap } from "../../components/Flex";
import SortByControl from "../SmartFilter/SortByControl";
import { InsertButton } from "../SmartForm/InsertButton";
import type { SmartCardListProps } from "./SmartCardList";

export const SmartCardListHeaderControls = (
  props: SmartCardListProps & {
    totalRows: number | undefined;
    itemsLength: number | undefined;
    columns: ValidatedColumnInfo[];
    state: ReturnType<typeof useSmartCardListControls>;
  },
) => {
  const { title, totalRows, db, tables, methods, columns, state } = props;

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
            value={
              sorting.orderBy ?
                {
                  key: getKeys(sorting.orderBy)[0]!,
                  asc: Object.values(sorting.orderBy)[0],
                }
              : undefined
            }
            onChange={(newSort) => {
              sorting.setOrderBy(
                !newSort ? {} : { [newSort.key]: !!newSort.asc },
              );
            }}
          />
        </>
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
    itemsLength: number | undefined;
    columns: ValidatedColumnInfo[];
    stateOrderBy: Record<string, boolean> | undefined;
    setOrderBy: (orders: Record<string, boolean>) => void;
  },
) => {
  const {
    title,
    itemsLength,
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
