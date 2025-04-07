import {
  useAsyncEffectQueue,
  usePromise,
} from "prostgles-client/dist/react-hooks";
import { isObject, type AnyObject } from "prostgles-types";
import { useEffect, useMemo, useState } from "react";
import { type usePagination } from "../../components/Table/Pagination";
import { getSelectForFieldConfigs } from "../SmartCard/getSelectForFieldConfigs";
import { getSmartCardColumns } from "../SmartCard/getSmartCardColumns";
import type { SmartCardListProps } from "./SmartCardList";
import { useWhyDidYouUpdate } from "../../components/MonacoEditor/useWhyDidYouUpdate";

export const useSmartCardListState = (
  {
    /** Removed to reduced re-renders */
    footer,
    noDataComponent,
    ...props
  }: SmartCardListProps,
  paginationState: ReturnType<typeof usePagination>,
  stateOrderBy: Record<string, boolean> | undefined,
) => {
  const { tableName, db, columns: columnsFromProps } = props;

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
    if ("data" in props) {
      return {
        type: "fixed",
        data: props.data,
        onChange: props.onChange,
      } as const;
    }
    if (isObject(props.tableName)) {
      return {
        type: "sql",
        ...props.tableName,
      } as const;
    }
    return {
      type: "table",
      ...props,
    } as const;
  }, [props]);

  /** Fixed data */
  useEffect(() => {
    if (smartProps.type === "fixed") {
      setItems(smartProps.data);
      setLoaded(true);
      setLoading(false);
    }
  }, [smartProps]);

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
  }, [smartProps, db, paginationState]);

  const { page = 1, pageSize } = paginationState;
  const tableDataHandlers = useMemo(() => {
    if (smartProps.type === "table") {
      const {
        fieldConfigs,
        throttle = 0,
        filter = {},
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
            totalRows = (await tableHandler.count?.(filter)) ?? -1;
          } catch (error) {
            console.error(error);
          }

          const items = await tableHandler.find(filter, {
            limit: pageSize,
            orderBy,
            select,
            offset: (page - 1) * pageSize,
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
        filter,
        limit,
        orderBy,
      };
    }
  }, [smartProps, columns, page, pageSize, stateOrderBy, tableHandler]);

  useWhyDidYouUpdate(props);
  /** Table data */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useAsyncEffectQueue(async () => {
    if (!tableDataHandlers) return;
    const { setData, realtime, filter, throttle, select } = tableDataHandlers;
    if (realtime) {
      if (!tableHandler?.subscribe) {
        throw new Error("tableHandler.subscribe missing");
      }
      const sub = await tableHandler.subscribe(
        filter,
        { limit: 0, select, throttle },
        () => {
          setData();
        },
      );
      return sub.unsubscribe;
    } else {
      setData();
    }
  }, [tableDataHandlers, tableHandler]);

  return {
    columns: columns ?? fetchedColumns,
    loading,
    items,
    error,
    loaded,
    totalRows,
    setTotalRows,
  };
};
