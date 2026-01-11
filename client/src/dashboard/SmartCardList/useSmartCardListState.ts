import { getSmartGroupFilter } from "@common/filterUtils";
import { useAsyncEffectQueue } from "prostgles-client";
import { isObject, type AnyObject } from "prostgles-types";
import { useEffect, useMemo, useState } from "react";
import { getSelectForFieldConfigs } from "../SmartCard/getSelectForFieldConfigs";
import { useSmartCardColumns } from "../SmartCard/useSmartCardColumns";
import type { SmartCardListProps } from "./SmartCardList";

export type SmartCardListState = ReturnType<typeof useSmartCardListState>;
export const useSmartCardListState = (
  props: Pick<
    SmartCardListProps,
    | "db"
    | "tableName"
    | "columns"
    | "onSetData"
    | "fieldConfigs"
    | "filter"
    | "throttle"
    | "limit"
    | "realtime"
    | "orderBy"
    | "showTopBar"
    | "orderByfields"
    | "tables"
    | "searchFilter"
  > & {
    offset: number;
  },
) => {
  const {
    orderByfields,
    tableName,
    db,
    columns: columnsFromProps,
    filter,
    throttle,
    limit,
    offset,
    realtime,
    fieldConfigs,
    orderBy,
    onSetData,
    showTopBar,
    tables,
    searchFilter,
  } = props;

  const [localOrderBy, setLocalOrderBy] = useState(
    Array.isArray(orderBy) ? undefined : orderBy,
  );
  const [localFilter, setLocalFilter] = useState(searchFilter);

  const columns = useSmartCardColumns({
    tableName,
    db,
    tables,
    columns: columnsFromProps,
  });

  const [items, setItems] = useState<AnyObject[]>();
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [error, setError] = useState<unknown>(null);
  const [totalRows, setTotalRows] = useState<number | undefined>(-1);

  const tableHandler =
    typeof tableName === "string" ? db[tableName] : undefined;

  const smartProps = useMemo(() => {
    if (isObject(tableName)) {
      return {
        type: "sql",
        ...tableName,
      } as const;
    }

    const fullFilter =
      localFilter ?
        getSmartGroupFilter(localFilter, filter && { filters: [filter] })
      : filter;

    const table = tables.find((t) => t.name === tableName);
    const showInsert = isObject(showTopBar) ? showTopBar.insert : showTopBar;
    const willShowInsert =
      showInsert &&
      typeof tableName === "string" &&
      table?.columns.some((c) => c.insert);

    const showSort = isObject(showTopBar) ? showTopBar.sort : showTopBar;
    const willShowSort = showSort && orderByfields?.length !== 0;
    return {
      type: "table",
      tableName,
      filter,
      fullFilter,
      throttle,
      limit,
      realtime,
      fieldConfigs,
      orderBy: localOrderBy ?? orderBy,
      localOrderBy,
      onSetData,
      table,
      willShowInsert,
      willShowSort,
    } as const;
  }, [
    tableName,
    filter,
    throttle,
    limit,
    realtime,
    fieldConfigs,
    onSetData,
    localFilter,
    orderBy,
    localOrderBy,
    tables,
    showTopBar,
    orderByfields?.length,
  ]);

  useEffect(() => {
    if (!items || smartProps.type !== "table") return;
    smartProps.onSetData?.(items);
  }, [smartProps, items]);

  /** SQL data */
  useEffect(() => {
    if (smartProps.type === "sql") {
      if (!db.sql) {
        console.error("db.sql missing");
        setLoaded(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { sqlQuery, args } = smartProps;
      db.sql(sqlQuery, args ?? {}, { returnType: "rows" })
        .then((items) => {
          setItems(items);
          setLoaded(true);
          setLoading(false);
          setTotalRows(items.length);
          setError(null);
        })
        .catch((error) => {
          setError(error);
          setLoading(false);
        });
    }
  }, [smartProps, db]);

  const tableDataHandlers = useMemo(() => {
    if (smartProps.type === "table") {
      const {
        fieldConfigs,
        throttle = 0,
        fullFilter,
        limit = 25,
        realtime,
        orderBy,
      } = smartProps;
      const select = getSelectForFieldConfigs(fieldConfigs, columns);

      const setData = async () => {
        setLoading(true);
        try {
          if (!tableHandler?.find) {
            throw new Error("tableHandler.find missing");
          }

          let totalRows = -1;
          try {
            totalRows = (await tableHandler.count?.(fullFilter)) ?? -1;
          } catch (error) {
            console.error(error);
          }

          const items = await tableHandler.find(fullFilter, {
            limit,
            orderBy,
            select,
            offset,
          });
          setItems(items);
          setLoaded(true);
          setTotalRows(totalRows);
        } catch (error: any) {
          setError(error);
        }
        setLoading(false);
      };

      return {
        setData,
        select,
        realtime,
        throttle,
        limit,
        orderBy,
        fullFilter,
      };
    }
  }, [smartProps, columns, offset, tableHandler]);

  /** Table data */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useAsyncEffectQueue(async () => {
    if (!tableDataHandlers) return;
    const {
      setData,
      realtime,
      throttle,
      select,
      fullFilter = {},
    } = tableDataHandlers;
    if (realtime) {
      try {
        if (!tableHandler?.subscribe) {
          throw new Error("tableHandler.subscribe missing");
        }
        /** This is to not wait for the subscription to start */
        void setData();
        const sub = await tableHandler.subscribe(
          fullFilter,
          { limit: 0, select, throttle },
          () => {
            void setData();
          },
        );
        return sub.unsubscribe;
      } catch (error) {
        setError(error);
        setLoading(false);
        return;
      }
    } else {
      void setData();
    }
  }, [tableDataHandlers, tableHandler]);

  const tableControls = useMemo(
    () =>
      smartProps.type === "table" && smartProps.table ?
        {
          ...smartProps,
          localFilter,
          setLocalFilter,
          localOrderBy,
          setLocalOrderBy,
        }
      : undefined,
    [localFilter, localOrderBy, smartProps],
  );

  const state = {
    columns,
    loading,
    items,
    error,
    loaded,
    totalRows,
    setTotalRows,
    tableControls,
  };

  return state;
};
