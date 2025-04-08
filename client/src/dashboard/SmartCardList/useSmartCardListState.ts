import {
  useAsyncEffectQueue,
  usePromise,
} from "prostgles-client/dist/react-hooks";
import { isObject, type AnyObject } from "prostgles-types";
import { useEffect, useMemo, useState } from "react";
import {
  getSmartGroupFilter,
  type SmartGroupFilter,
} from "../../../../commonTypes/filterUtils";
import { getSelectForFieldConfigs } from "../SmartCard/getSelectForFieldConfigs";
import { getSmartCardColumns } from "../SmartCard/getSmartCardColumns";
import type { ColumnSort } from "../W_Table/ColumnMenu/ColumnMenu";
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
  > & {
    offset: number;
  },
  stateOrderBy: ColumnSort | undefined,
) => {
  const {
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
  } = props;

  const [localFilter, setLocalFilter] = useState<SmartGroupFilter>();

  const fetchedColumns = usePromise(async () => {
    if (columnsFromProps) {
      return;
    }
    return await getSmartCardColumns({ tableName, db });
  }, [columnsFromProps, db, tableName]);
  const columns = columnsFromProps ?? fetchedColumns;

  const [items, setItems] = useState<AnyObject[]>();
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [error, setError] = useState<any>(null);
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
    return {
      type: "table",
      tableName,
      filter,
      fullFilter,
      throttle,
      limit,
      realtime,
      fieldConfigs,
      orderBy,
      onSetData,
    } as const;
  }, [
    tableName,
    filter,
    throttle,
    limit,
    realtime,
    fieldConfigs,
    orderBy,
    onSetData,
    localFilter,
  ]);

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
      } = smartProps;
      const orderBy = stateOrderBy ?? smartProps.orderBy;
      const select = getSelectForFieldConfigs(fieldConfigs, columns);

      const setData = async () => {
        const select = getSelectForFieldConfigs(fieldConfigs, columns);

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

          smartProps.onSetData?.(items);
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
  }, [smartProps, columns, offset, stateOrderBy, tableHandler]);

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
        setData();
        const sub = await tableHandler.subscribe(
          fullFilter,
          { limit: 0, select, throttle },
          () => {
            setData();
          },
        );
        return sub.unsubscribe;
      } catch (error) {
        setError(error);
        setLoading(false);
        return;
      }
    } else {
      setData();
    }
  }, [tableDataHandlers, tableHandler]);

  const state = {
    columns: columns ?? fetchedColumns,
    loading,
    items,
    error,
    loaded,
    totalRows,
    setTotalRows,
    tableControls:
      smartProps.type === "table" ?
        {
          tableName: smartProps.tableName,
          localFilter,
          setLocalFilter,
          filter: smartProps.filter,
        }
      : undefined,
  };

  return state;
};
