import type { AnyObject } from "prostgles-types";
import { isDefined, isEmpty } from "prostgles-types";
import type { DeltaOf, DeltaOfData } from "../RTComp";
import { getSmartGroupFilter } from "../SmartFilter/SmartFilter";
import type { ProstglesTableD, W_TableProps, W_TableState } from "./W_Table";
import W_Table from "./W_Table";
import { getSort, simplifyFilter } from "./tableUtils/tableUtils";
import type { WindowData } from "../Dashboard/dashboardUtils";
import { getTableSelect } from "./tableUtils/getTableSelect";
import { omitKeys, pickKeys } from "prostgles-types";

export const getTableFilter = (
  w: WindowData<"table">,
  {
    externalFilters,
    joinFilter,
  }: Pick<W_TableProps, "joinFilter" | "externalFilters">,
) => {
  const { filter: rawFilter, having: rawHaving } = w;

  let filter: AnyObject = {};
  let having: AnyObject = {};
  /* Parse and Remove bad filters */
  if (w.table_name) {
    filter = getSmartGroupFilter(
      rawFilter || [],
      undefined,
      w.options?.filterOperand === "OR" ? "or" : undefined,
    );
    having = getSmartGroupFilter(
      rawHaving || [],
      undefined,
      w.options?.havingOperand === "OR" ? "or" : undefined,
    );
  }

  return {
    filter:
      simplifyFilter({
        $and: [
          !isEmpty(filter) ? filter : undefined,
          joinFilter,
          ...externalFilters,
        ].filter(isDefined),
      }) ?? {},
    having:
      simplifyFilter({
        $and: [having].filter(isDefined),
      }) ?? {},
  };
};

export async function getTableData(
  this: W_Table,
  dp: DeltaOf<W_TableProps>,
  ds: DeltaOf<W_TableState>,
  dd: DeltaOfData<ProstglesTableD>,
  { showCounts }: { showCounts: boolean },
) {
  const delta = { ...dp, ...ds, ...dd };
  const { rows } = this.state;
  const {
    prgl: { db },
    joinFilter,
    tables,
  } = this.props;
  const { w } = this.d;
  if (!w) return;
  const { table_name: tableName } = w;

  let ns: Partial<W_TableState> | undefined;

  const tableHandler = db[tableName];
  if (!tableHandler) return;
  try {
    if (!tableHandler.find) {
      if (this.state.rows?.length !== 0) {
        ns = { rows: [] };
      }
    } else if (
      !rows ||
      delta.w?.options?.refresh ||
      delta.dataAge ||
      [
        "pageSize",
        "page",
        "sort",
        "filter",
        "having",
        "joinFilter",
        "externalFilters",
        "limit",
        "cols",
        "dataAge",
        "db",
        "activeRow",
        "columns",
      ].some((k) => k in delta || (delta.w && k in delta.w))
    ) {
      const tableFilterHaving = getTableFilter(w, this.props);
      const { filter: _f, having: _h } = tableFilterHaving;
      const {
        select: selectWithoutData,
        barchartVals: barchartValsWithoutData,
      } = await getTableSelect(w, tables, db, _f, true);
      const strFilter = JSON.stringify(tableFilterHaving);

      const clearSub = () => {
        return this.dataSub?.unsubscribe?.();
      };
      const clearInterval = () => {
        if (this.autoRefresh) {
          clearTimeout(this.autoRefresh);
          this.autoRefresh = null;
        }
      };

      const setSub = (throttleSeconds = 0) => {
        if (this.dataSubFilter === strFilter) {
          return;
        }
        this.dataSubFilter = strFilter;

        return (async () => {
          await clearSub();
          clearInterval();

          try {
            /** Already getting data on first run */
            let isInitialRun = true;
            this.dataSub = await tableHandler.subscribe?.(
              _f,
              {
                select: selectWithoutData,
                limit: 0,
                throttle: throttleSeconds * 1000,
              },
              () => {
                if (isInitialRun) {
                  isInitialRun = false;
                  return;
                }
                this.setData({ dataAge: Date.now() });
              },
            );
          } catch (error: any) {
            console.error("Subscribe failed", error);
          }
        })();
      };

      /** Resubscribe if filter changed or refresh cahnged */
      if (w.options.refresh?.type === "Realtime" && tableHandler.subscribe) {
        setSub(w.options.refresh.throttleSeconds);
      }

      /** Set data refresh */
      if ("refresh" in (delta.w?.options || {})) {
        const {
          type = "None",
          throttleSeconds = 0,
          intervalSeconds = 3,
        } = w.options.refresh || {};

        /** Resubscribe if filter changed or refresh changed */
        if (type === "Realtime") {
          setSub(throttleSeconds);

          /* Auto refresh settings */
        } else if (type === "Interval" && intervalSeconds > 0) {
          this.autoRefresh = setInterval(() => {
            this.setState({ dataAge: Date.now() });
          }, intervalSeconds * 1000);
        } else if (type === "None") {
          await clearSub();
          clearInterval();
        }
      }

      const orderBy = getSort(tables, w);
      const { limit, offset } = this.getPagination();

      const dataAge = delta.dataAge ?? this.dataAge ?? 0;
      const cardOpts =
        w.options.viewAs?.type === "card" ? w.options.viewAs : undefined;
      const qSig = W_Table.getTableDataRequestSignature(
        {
          select: selectWithoutData,
          barchartVals: barchartValsWithoutData,
          orderBy,
          limit,
          offset,
          joinFilter,
          filter: _f,
          having: _h,
        },
        dataAge,
        [cardOpts],
      );

      if (this.currentDataRequestSignature !== qSig) {
        this.dataAge = dataAge;
        this.currentDataRequestSignature = qSig;

        if (!this.state.runningQuerySince) {
          this.setState({ runningQuerySince: Date.now() });
        }

        const { select, barchartVals } = await getTableSelect(
          w,
          tables,
          db,
          _f,
        );
        if (barchartVals) {
          ns = ns || ({} as any);
          ns!.barchartVals = {
            ...this.state.barchartVals,
            ...barchartVals,
          };
        }

        if (Object.keys(select).length) {
          const findParams = {
            select,
            orderBy: orderBy as any,
            limit,
            offset,
            having: _h,
          };
          let rowCount: number | undefined;
          try {
            rowCount = await tableHandler.count?.(
              _f,
              pickKeys(findParams, ["select", "having"]),
            );
          } catch (error: any) {
            console.error("Error getting rowCount", error, error.query);
            console.error("Error getting rowCount params", _f, findParams);
            throw error;
          }
          let initialRows: AnyObject[] = [];
          if (cardOpts?.cardGroupBy) {
            /**
             * If card group mode then get top records for each group
             */
            const groupByColumn = cardOpts.cardGroupBy;
            const groupByFindParams = {
              ...omitKeys(findParams, ["orderBy"]),
              ...(cardOpts.cardOrderBy ?
                { orderBy: { [cardOpts.cardOrderBy]: true } }
              : {}),
            };
            const groups =
              rowCount == 0 ?
                []
              : await tableHandler.find(_f, {
                  select: { [cardOpts.cardGroupBy]: 1 },
                  groupBy: true,
                  returnType: "values",
                });
            initialRows = (
              await Promise.all(
                groups.map((groupByValue) =>
                  tableHandler.find!(
                    { $and: [_f, { [groupByColumn]: groupByValue }] },
                    groupByFindParams,
                  ),
                ),
              )
            ).flat();
          } else {
            initialRows =
              rowCount == 0 ? [] : await tableHandler.find(_f, findParams);
          }

          this.activeRowStr = JSON.stringify(joinFilter || {});

          const rows = initialRows.map((r) => ({
            ...r,
          }));

          const newName =
            showCounts ?
              `${w.table_name} - ${(rowCount ?? "??").toLocaleString()} records`
            : w.table_name;
          if (newName !== w.name) {
            w.$update({ name: newName });
          }
          ns = {
            ...ns,
            rows,
            rowCount,
            rowsLoaded: Date.now(),
            totalRows: showCounts ? +((await tableHandler.count?.()) ?? 0) : 0,
            onRowClick: (row, a2) => {
              /** Must only include non computed columns  */
              const rowHasNonComputedFields = this.d.w?.columns?.find(
                (c) =>
                  !c.computedConfig &&
                  !c.format &&
                  Object.keys(row ?? {}).includes(c.name),
              );
              if (row && rowHasNonComputedFields) {
                this.props.onClickRow?.(row, a2);
              } else {
                this.props.onClickRow?.(undefined, a2);
              }
            },
          };
          if (joinFilter) {
            ns.joinFilterStr = JSON.stringify(joinFilter);
          } else {
            ns.joinFilterStr = undefined;
          }
        } else {
          ns = { ...ns, rows: [], rowCount: 0 };
        }
        ns.error = undefined;
      }
    }
  } catch (error: any) {
    console.error(error);
    ns = { ...ns, error, rows: [] };
  }

  if (ns) {
    ns.runningQuerySince = undefined;
    this.setState(ns as any);
  }
}
