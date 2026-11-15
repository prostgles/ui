import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { usePagination } from "@components/Table/Pagination";
import { closest, PAGE_SIZES } from "@components/Table/Table";
import {
  useAsyncEffectQueue,
  useDeepCompareMemoize,
  useFetch,
  usePromise,
  type TableHandlerClient,
} from "prostgles-client";
import { pickKeys, type AnyObject } from "prostgles-types";
import type { W_TableProps } from "../W_Table";
import type { ColumnSort } from "@common/ColumnConfig/ColumnConfig";
import { getTableSelect } from "../tableUtils/getTableSelect";
import { getSort } from "../tableUtils/tableUtils";
import { getTableDataRequestSignature } from "../tableUtils/getTableDataRequestSignature";
import { getTableFilter } from "./getTableFilter";
import {
  getGroupedNextPage,
  getGroupedTableData,
  GROUP_LIMIT,
} from "./getGroupedTableData";

export const useTableData = ({
  w,
  prgl,
  workspace,
  joinFilter,
  externalFilters,
}: W_TableProps) => {
  const { db, tables, methods, dbKey } = prgl;
  const tableHandler: Partial<TableHandlerClient> | undefined =
    db[w.table_name];
  const useFind = tableHandler?.useFind ?? useEmptyFind;
  const useCount = tableHandler?.useCount ?? useEmptyCount;
  const pagination = usePagination(
    closest(Math.round((1.2 * window.innerHeight) / 55) || 25, PAGE_SIZES) ??
      25,
  );
  const [refreshVersion, refresh] = useReducer(
    (version: number) => version + 1,
    0,
  );
  const showCounts =
    w.options.hideCount === false ||
    (!workspace.options.hideCounts && !w.options.hideCount);
  const { filter, having } = getTableFilter(w, { joinFilter, externalFilters });
  const filterKey = JSON.stringify([dbKey, w.table_name, filter, having]);
  const [pageFilterKey, setPageFilterKey] = useState(filterKey);
  if (pageFilterKey !== filterKey) {
    setPageFilterKey(filterKey);
    pagination.onPageChange(0);
  }
  const offset = joinFilter ? 0 : pagination.offset;
  const cardOptions =
    w.options.viewAs?.type === "card" ? w.options.viewAs : undefined;
  const groupColumn = cardOptions?.cardGroupBy;
  const selectionInput = useDeepCompareMemoize({
    table_name: w.table_name,
    columns: w.columns,
    options: { viewAs: w.options.viewAs },
    filter,
    dbKey,
  });
  const preparedSelection = usePromise(async () => {
    try {
      return {
        input: selectionInput,
        ...(await getTableSelect(
          selectionInput,
          tables,
          db,
          selectionInput.filter,
          false,
          methods,
        )),
        error: undefined as unknown,
      };
    } catch (error) {
      return {
        input: selectionInput,
        select: {},
        barchartVals: undefined,
        error,
      };
    }
    /* Chart ranges depend on the current data as well as the selection. */
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [selectionInput, tables, db, methods, refreshVersion]);
  const selection =
    preparedSelection?.input === selectionInput ? preparedSelection : undefined;
  const canFetch =
    !!selection && !selection.error && Object.keys(selection.select).length > 0;
  const subscribe = tableHandler?.subscribe;
  const select = selection?.select;
  const throttle = (w.options.refresh?.throttleSeconds ?? 0) * 1000;
  const refreshType = w.options.refresh?.type;
  const intervalSeconds = w.options.refresh?.intervalSeconds ?? 3;
  const [subscriptionError, setSubscriptionError] = useState<unknown>();
  const [subscriptionRetryVersion, retrySubscription] = useReducer(
    (version: number) => version + 1,
    0,
  );
  useAsyncEffectQueue(() => {
    setSubscriptionError(undefined);
    if (!canFetch || refreshType !== "Realtime" || !subscribe) {
      return Promise.resolve();
    }
    return subscribe(filter, { select, limit: 0, throttle }, (_rows, error) => {
      setSubscriptionError(error);
      if (!error) refresh();
    })
      .then((subscription) => subscription.unsubscribe)
      .catch(setSubscriptionError);
  }, [
    canFetch,
    refreshType,
    subscribe,
    filter,
    select,
    throttle,
    subscriptionRetryVersion,
  ]);
  useEffect(() => {
    if (refreshType !== "Interval" || intervalSeconds <= 0) return;
    const interval = setInterval(refresh, intervalSeconds * 1000);
    return () => clearInterval(interval);
  }, [refreshType, intervalSeconds]);

  const params = {
    select: selection?.select ?? {},
    orderBy: getSort(tables, w) as ColumnSort[],
    limit: pagination.limit,
    offset,
    having,
  };
  const refreshDependencies = [refreshVersion];
  const foundRows = useFind(filter, params, {
    skip: !canFetch || !!groupColumn,
    deps: refreshDependencies,
  });
  const groups = useFind(
    filter,
    {
      select: { [groupColumn ?? ""]: 1 },
      groupBy: true,
      returnType: "values",
      limit: GROUP_LIMIT,
    },
    { skip: !canFetch || !groupColumn, deps: refreshDependencies },
  );
  const groupParams = {
    ...params,
    orderBy:
      cardOptions?.cardOrderBy ?
        { [cardOptions.cardOrderBy]: true }
      : undefined,
  };
  const groupedRows = useFetch(
    getGroupedTableData,
    [tableHandler?.find, groups.data, groupColumn, filter, groupParams],
    {
      skip: !canFetch || !groupColumn || groups.isLoading || !groups.data,
      deps: refreshDependencies,
    },
  );
  const groupedData = groupedRows.data as Awaited<
    ReturnType<typeof getGroupedTableData>
  >;
  const rowResult = groupColumn ? groupedRows : foundRows;
  const fetchedRows: AnyObject[] | undefined =
    groupColumn ? groupedData?.rows : foundRows.data;
  const [retainedRows, setRetainedRows] = useState<AnyObject[] | undefined>();
  useEffect(() => {
    if (fetchedRows) setRetainedRows(fetchedRows);
  }, [fetchedRows]);
  const hasFullPage =
    groupColumn ?
      !!groupedData?.fullPages.length
    : fetchedRows?.length === params.limit;
  const nextPageEnabled = canFetch && !rowResult.isLoading && hasFullPage;
  const nextPage = useFind(
    filter,
    {
      select: params.select,
      having,
      limit: 1,
      offset: offset + params.limit,
    },
    {
      skip: !nextPageEnabled || !!groupColumn,
      deps: refreshDependencies,
    },
  );
  const groupedNextPage = useFetch(
    getGroupedNextPage,
    [tableHandler?.find, groupedData, groupParams],
    {
      skip: !nextPageEnabled || !groupColumn,
      deps: refreshDependencies,
    },
  );
  const nextPageResult = groupColumn ? groupedNextPage : nextPage;
  const hasNextPage =
    hasFullPage &&
    (nextPageResult.isLoading ||
      !!nextPageResult.error ||
      (groupColumn ?
        groupedNextPage.data !== false
      : nextPage.data?.length !== 0));
  const inferredCount = offset + (fetchedRows?.length ?? 0);
  const countIsExact =
    !!fetchedRows &&
    !hasNextPage &&
    (groupColumn ?
      offset === 0 && !!groupedData?.groupsComplete
    : offset === 0 || fetchedRows.length > 0);
  const countEnabled =
    canFetch &&
    showCounts &&
    !!fetchedRows &&
    !rowResult.isLoading &&
    !countIsExact &&
    (!hasFullPage || !nextPageResult.isLoading);
  const countParams = pickKeys(params, ["select", "having"]);
  const count = useCount(filter, countParams, {
    skip: !countEnabled,
    deps: refreshDependencies,
  });
  const countKey = getTableDataRequestSignature({ filter, ...countParams }, 0, [
    dbKey,
    w.table_name,
  ]);
  const previousCount = useRef<{ key: string; count: number }>();
  if (countEnabled && !count.isLoading && typeof count.data === "number") {
    previousCount.current = { key: countKey, count: count.data };
  }
  const exactCount =
    countIsExact ? inferredCount
    : showCounts && previousCount.current?.key === countKey ?
      previousCount.current.count
    : undefined;

  const rows = selection && !canFetch ? [] : (fetchedRows ?? retainedRows);
  const isLoading =
    !selection ||
    (canFetch && (rowResult.isLoading || (!!groupColumn && groups.isLoading)));
  const [runningQuerySince, setRunningQuerySince] = useState<
    number | undefined
  >();
  useEffect(
    () => setRunningQuerySince(isLoading ? Date.now() : undefined),
    [isLoading],
  );

  const tableLabel =
    tables.find(({ name }) => name === w.table_name)?.label ?? w.table_name;
  useEffect(() => {
    if (showCounts && exactCount == null) return;
    const displayedCount =
      showCounts && exactCount != null ? exactCount.toLocaleString() : "";
    const name = (
      w.title || `${tableLabel}${displayedCount ? " ${rowCount}" : ""}`
    ).replace("${rowCount}", displayedCount);
    if (name !== w.name) void w.$update({ name });
  }, [w, tableLabel, showCounts, exactCount]);

  const [actionError, setError] = useState<unknown>();
  useEffect(() => {
    if (fetchedRows) setError(undefined);
  }, [fetchedRows]);
  const retry = useCallback(() => {
    setError(undefined);
    if (subscriptionError) retrySubscription();
    refresh();
  }, [subscriptionError]);
  const error =
    actionError ??
    selection?.error ??
    rowResult.error ??
    (groupColumn ? groups.error : undefined) ??
    (nextPageEnabled ? nextPageResult.error : undefined) ??
    subscriptionError;
  return {
    rows: rows ?? (error ? [] : undefined),
    barchartVals: selection?.barchartVals,
    runningQuerySince,
    error,
    setError,
    refresh: retry,
    rowCount: exactCount,
    pagination: {
      ...pagination,
      totalRows: exactCount,
      hasNextPage: groupColumn || exactCount == null ? hasNextPage : undefined,
      pageCountInfo:
        exactCount == null ? ""
        : groupColumn ? `${exactCount.toLocaleString()} rows`
        : undefined,
    },
  };
};

const emptyFind = () => Promise.resolve([]);
const emptyCount = () => Promise.resolve(undefined);
const useEmptyFind: TableHandlerClient["useFind"] = (filter, params, options) =>
  useFetch(emptyFind, [filter, params], options);
const useEmptyCount: TableHandlerClient["useCount"] = (
  filter,
  params,
  options,
) => useFetch(emptyCount, [filter, params], options);
