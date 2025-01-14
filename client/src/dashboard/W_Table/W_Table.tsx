import { mdiAlertOutline, mdiPlus } from "@mdi/js";
import type { AnyObject, ParsedJoinPath } from "prostgles-types";
import { getKeys } from "prostgles-types";

import React from "react";
import Loading from "../../components/Loading";
import type { TableColumn, TableProps } from "../../components/Table/Table";
import { PAGE_SIZES, Table, closest } from "../../components/Table/Table";
import type {
  OnAddChart,
  Query,
  WindowData,
  WindowSyncItem,
  WorkspaceSyncItem,
} from "../Dashboard/dashboardUtils";
import "./ProstglesTable.css";

import type { DeltaOf, DeltaOfData } from "../RTComp";
import RTComp from "../RTComp";

import type { SingleSyncHandles } from "prostgles-client/dist/SyncedTable/SyncedTable";
import type { ValidatedColumnInfo } from "prostgles-types/lib";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import type { ColumnConfig, ColumnSort } from "./ColumnMenu/ColumnMenu";
import { ColumnMenu } from "./ColumnMenu/ColumnMenu";

import type { DetailedFilterBase } from "../../../../commonTypes/filterUtils";
import { matchObj } from "../../../../commonTypes/utils";
import { createReactiveState } from "../../appUtils";
import { Icon } from "../../components/Icon/Icon";
import type { PaginationProps } from "../../components/Table/Pagination";
import { isDefined, pickKeys } from "prostgles-types";
import { CodeEditor } from "../CodeEditor/CodeEditor";
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import { SmartFilterBar } from "../SmartFilterBar/SmartFilterBar";
import type { ProstglesQuickMenuProps } from "../W_QuickMenu";
import Window from "../Window";
import { CardView } from "./CardView";
import { NodeCountChecker } from "./NodeCountChecker";
import type { RowPanelProps } from "./RowCard";
import { RowCard } from "./RowCard";
import { W_TableMenu } from "./TableMenu/W_TableMenu";
import { TooManyColumnsWarning } from "./TooManyColumnsWarning";
import { getTableData } from "./getTableData";
import type {
  OnClickEditRow,
  RowSiblingData,
} from "./tableUtils/getEditColumn";
import { getTableCols } from "./tableUtils/getTableCols";
import { getTableSelect } from "./tableUtils/getTableSelect";
import { prepareColsForRender } from "./tableUtils/prepareColsForRender";
import {
  getFullColumnConfig,
  getSort,
  getSortColumn,
  updateWCols,
} from "./tableUtils/tableUtils";
import { W_Table_Content } from "./W_Table_Content";
import { getAndFixWColumnsConfig } from "./TableMenu/getAndFixWColumnsConfig";
import { isEqual } from "prostgles-types";
import type { Command } from "../../Testing";
import { t } from "../../i18n/i18nUtils";

export type W_TableProps = Omit<CommonWindowProps, "w"> & {
  w: WindowSyncItem<"table">;
  setLinkMenu: ProstglesQuickMenuProps["setLinkMenu"];
  childWindow: React.ReactNode | undefined;
  onLinkTable?: (tableName: string, path: ParsedJoinPath[]) => any | void;
  onClickRow?: TableProps["onRowClick"];
  filter?: any;
  joinFilter?: AnyObject;
  externalFilters: AnyObject[];
  activeRow?: ActiveRow;
  onAddChart?: OnAddChart;
  activeRowColor?: React.CSSProperties["color"];
  workspace: WorkspaceSyncItem;
};
export type ActiveRow = {
  window_id: string;
  table_name: string;
  row_filter: { [key: string]: any };
  timeChart?: {
    min: Date;
    max: Date;
    center: Date;
  };
};

export type MinMax<T = number> = {
  min: T;
  max: T;
};
/**
 * Used for cell timechart and barchart
 */
export type MinMaxVals = Record<string, MinMax>;

export function getFilter(filter: any = {}, activeRow?: ActiveRow): any {
  return {
    $and: [
      filter,
      !activeRow ? undefined : (
        {
          $existsJoined: {
            // [`**.${activeRow.table_name}`]: activeRow.row_filter
            path: ["**", activeRow.table_name],
            filter: activeRow.row_filter,
          },
        }
      ),
    ].filter((f) => f),
  };
}

export type ProstglesColumn = TableColumn & { computed?: boolean } & Pick<
    ValidatedColumnInfo,
    "name" | "tsDataType" | "udt_name" | "filter"
  >;

export type W_TableState = {
  rowCount: number;
  rowsLoaded: number;
  table?: (TableProps & Query) | any;
  sort?: ColumnSort[];
  loading: boolean;

  rows?: AnyObject[];
  filter: any;
  pos?: { x: number; y: number };
  size?: { w: number; h: number };
  joins: string[];
  runningQuerySince: number | undefined;
  error?: string;
  duration: number;
  hideTable?: boolean;
  sql: string;
  rowPanel?:
    | {
        type: "insert";
      }
    | {
        type: "update";
        rowIndex: number;
        filter: DetailedFilterBase[];
        siblingData: RowSiblingData;
        fixedUpdateData?: AnyObject;
      };
  rowDelta?: any;
  onRowClick?: TableProps["onRowClick"];

  filterPopup?: boolean;

  dataAge?: number;
  barchartVals?: MinMaxVals;
  columns?: ValidatedColumnInfo[];
  totalRows?: number;
  /**
   * Stringified joinFilter that is set after the data has been downloaded.
   * Used in setting activeRow styles to all rows adequately
   */
  joinFilterStr?: string;
  localCols?: ColumnConfigWInfo[];
  tooManyColumnsWarningWasShown?: boolean;
};

export type ProstglesTableD = {
  w?: WindowSyncItem<"table">;
  pageSize: Required<PaginationProps>["pageSize"];
  page: number;
  dataAge?: number;
  wSync?: SingleSyncHandles<Required<WindowData<"table">>, true>;
};

export type ColumnConfigWInfo = ColumnConfig & { info?: ValidatedColumnInfo };

export default class W_Table extends RTComp<
  W_TableProps,
  W_TableState,
  ProstglesTableD
> {
  refHeader?: HTMLDivElement;
  refResize?: HTMLElement;
  ref?: HTMLElement;
  refRowCount?: HTMLElement;

  rowPanelData: any;
  state: W_TableState = {
    barchartVals: {},
    rowsLoaded: 0,
    runningQuerySince: undefined,
    sql: "",
    loading: false,
    totalRows: 0,
    sort: [],
    joins: [],
    filter: {},
    rowCount: 0,
    duration: 0,
    error: "",
    hideTable: true,
    rowDelta: null,
    filterPopup: false,
    joinFilterStr: undefined,
  };
  d: ProstglesTableD = {
    page: 1,
    pageSize:
      closest(Math.round((1.2 * window.innerHeight) / 55) || 25, PAGE_SIZES) ??
      25,
    w: undefined,
    dataAge: 0,
    wSync: undefined,
  };

  calculatedColWidths = false;

  async onMount() {
    const { w } = this.props;

    if (!Array.isArray(w.filter)) {
      w.$update({ filter: [] });
    }

    this.d.wSync = w.$cloneSync((w, delta) => {
      this.setData({ w }, { w: delta });
    });
  }

  async onUnmount() {
    this.d.wSync?.$unsync();
    await this.dataSub?.unsubscribe?.();
  }

  /**
   * To reduce the number of unnecessary data requests let's save the query signature and allow new queries only if different
   */
  currentDataRequestSignature = "";
  static getTableDataRequestSignature(
    args:
      | {
          select?: AnyObject | any;
          filter?: AnyObject | any;
          having?: AnyObject | any;
          barchartVals?: AnyObject;
          joinFilter?: AnyObject;
          externalFilters?: any;
          orderBy?: AnyObject | any;
          limit?: number | null;
          offset?: number;
        }
      | { sql: string },
    dataAge: number,
    dependencies: any[] = [],
  ) {
    const argKeyObj: typeof args & { dataAge: number; dependencies: any[] } = {
      ...args,
      dataAge,
      dependencies,
    };
    const sigData = {};
    Object.keys(argKeyObj)
      .sort()
      .forEach((key) => {
        sigData[key] = argKeyObj[key];
      });

    return JSON.stringify(sigData);
  }

  onClickEditRow: OnClickEditRow = (
    filter,
    siblingData,
    rowIndex,
    fixedUpdateData,
  ) => {
    this.rowPanelRState.set({
      type: "update",
      rowIndex,
      filter,
      siblingData,
      fixedUpdateData,
    });
  };

  dataSub?: any;
  dataSubFilter?: string;
  dataAge?: number = 0;
  autoRefresh?: any;
  activeRowStr?: string;
  currDbKey?: string;
  onDelta = async (
    dp: DeltaOf<W_TableProps>,
    ds: DeltaOf<W_TableState>,
    dd: DeltaOfData<ProstglesTableD>,
  ) => {
    const delta = { ...dp, ...ds, ...dd };
    const { workspace } = this.props;
    const { db } = this.props.prgl;
    const { w } = this.d;
    const { table_name: tableName, table_oid } = w || {};

    let ns: Partial<W_TableState> | undefined;
    if (!w || !tableName) return;

    const tableHandler = db[tableName];

    /** Show count if user requires it  */
    const showCounts = !!(
      (!workspace.options.hideCounts && !w.options.hideCount) ||
      (workspace.options.hideCounts && w.options.hideCount === false)
    );

    /* Table was renamed. Replace from oid or fail gracefully */
    if (tableName && table_oid && !tableHandler) {
      const match = this.props.tables.find((ti) => ti.info.oid === table_oid);
      if (match) {
        await w.$update({ table_name: match.name });
        return;
      } else {
        /** Reset schema related properties */
        const emptyInfo = { columns: null, filter: [], having: [], sort: null };
        const different =
          !this.d.w ?
            undefined
          : Object.entries(emptyInfo).filter(
              ([key, val]) => !isEqual(this.d.w![key], val),
            );
        if (different?.length) {
          await w.$update(emptyInfo);
        }
      }
    }

    if (!tableHandler) return;

    if (delta.w && ("filter" in delta.w || "having" in delta.w)) {
      this.props.onForceUpdate();
    }

    const { dbKey } = this.props.prgl;
    if (this.currDbKey !== dbKey) {
      getAndFixWColumnsConfig(this.props.prgl.tables, w);
      this.currDbKey = dbKey;
    }

    /* Simply re-render */
    if (
      ["showSubLabel", "maxRowHeight"].some(
        (key) => delta.w?.options && key in delta.w.options,
      )
    ) {
      ns = ns || ({} as any);
    }

    /** This is done to prevent errors due to renamed/altered columns */
    if (
      delta.w?.columns?.length &&
      w.sort?.some((sort) => !getSortColumn(sort, delta.w?.columns ?? []))
    ) {
      w.$update({ sort: [] });
    }

    /** This is done to prevent errors due to renamed/altered columns */
    if (
      (delta.w?.filter || delta.w?.having) &&
      !delta.w.id &&
      !w.options.showFilters
    ) {
      w.$update({ options: { showFilters: true } }, { deepMerge: true });
    }

    /** This is done to prevent empty result due to page offset */
    if ((delta.w?.filter || delta.w?.having) && this.d.page !== 1) {
      this.setData({ page: 1 });
    }

    /** Trigger count on hideCount toggle */
    if (
      delta.w?.options &&
      "hideCount" in delta.w.options &&
      this.state.rows?.length
    ) {
      ns = {
        ...ns,
        dataAge: Date.now(),
      };
    }

    const changedOpts = getKeys(delta.w?.options || {});

    /**
     * Get data
     */
    getTableData.bind(this)(dp, ds, dd, { showCounts });

    /** Force update */
    const rerenderOPTS: (keyof typeof w.options)[] = [
      "viewAs",
      "hideEditRow",
      "showFilters",
    ];
    if (
      !ns &&
      (delta.w?.columns ||
        (changedOpts.length &&
          rerenderOPTS.some((k) => changedOpts.includes(k))))
    ) {
      ns ??= {} as any;
    }

    if (ns) {
      this.setState(ns as W_TableState);
    }
  };

  getWCols = () => {
    const { w } = this.d;
    const { tables } = this.props;
    const { rows } = this.state;
    return !w ?
        []
      : getFullColumnConfig(tables, w, rows, this.ref?.offsetWidth);
  };

  getPaginationProps = (): PaginationProps => {
    const { page, pageSize } = this.d;

    const { rowCount } = this.state;

    return {
      page,
      pageSize,
      totalRows: rowCount,
      onPageChange: (newPage) => {
        this.setData({ page: newPage });
      },
      onPageSizeChange: (pageSize) => {
        this.setData({ pageSize });
      },
    };
  };

  getPagination() {
    const { pageSize, page } = this.d;
    return {
      limit: pageSize,
      offset: this.props.joinFilter ? 0 : (page - 1) * pageSize,
    };
  }

  getMenu = (w, onClose) => {
    const { prgl, onLinkTable, onAddChart } = this.props;

    const cols = w.columns;

    if (!cols) return null;

    return (
      <W_TableMenu
        prgl={prgl}
        workspace={this.props.workspace}
        cols={cols.filter((c) => !c.computed)}
        onAddChart={onAddChart}
        w={w}
        onLinkTable={onLinkTable}
        suggestions={this.props.suggestions}
        onClose={onClose}
        externalFilters={this.props.externalFilters}
        joinFilter={this.props.joinFilter}
      />
    );
  };

  onSort = async (sort: ColumnSort[]) => {
    const { tables, db } = this.props.prgl;
    const { w } = this.d;
    if (!w) return null;
    const { table_name: tableName } = w;
    const tableHandler = db[tableName];

    try {
      // const columnsConfig = await getAndFixWColumnsConfig(tables, w); //columns: columnsConfig,
      const orderBy = getSort(tables, { ...w, sort }) as any;
      /** Ensure the sort is valid */
      const { select } = await getTableSelect(w, tables, db, {}, true);
      await tableHandler?.find!({}, { select, limit: 0, orderBy });
      w.$update({ sort });
    } catch (error: any) {
      this.setState({ error });
    }
  };

  rowPanelRState = createReactiveState<RowPanelProps | undefined>(undefined);

  onColumnReorder = (newCols: ProstglesColumn[]) => {
    const { w } = this.d;
    if (!w) return null;
    const nIdxes = newCols
      .filter((c) => !(c.computed && c.key === "edit_row"))
      .map((c) => c.name);
    const columns = this.d.w?.columns
      ?.slice(0)
      .sort((a, b) => nIdxes.indexOf(a.name) - nIdxes.indexOf(b.name));
    updateWCols(w, columns);
  };

  columnMenuState = createReactiveState<
    | {
        column: string;
        clientX: number;
        clientY: number;
      }
    | undefined
  >(undefined);

  render() {
    const { loading, rows, runningQuerySince, error } = this.state;

    const showTableNotFound = (tableName: string) => (
      <div
        className=" p-2 flex-row ai-center text-danger"
        data-command={"W_Table.TableNotFound" satisfies Command}
      >
        <Icon path={mdiAlertOutline} size={1} className="mr-p5 " />
        Table {JSON.stringify(tableName)} not found
      </div>
    );

    const { w } = this.d;
    if (!w) {
      if (
        this.props.w.table_name &&
        !this.props.prgl.db[this.props.w.table_name]
      ) {
        return showTableNotFound(this.props.w.table_name);
      }
      return null;
    }
    const {
      setLinkMenu,
      joinFilter,
      activeRow,
      onAddChart,
      activeRowColor,
      prgl,
      childWindow,
    } = this.props;
    const { tables, db, dbs } = prgl;
    const activeRowStyle: React.CSSProperties =
      this.activeRowStr === JSON.stringify(joinFilter || {}) ?
        { background: activeRowColor }
      : {};

    const FirstLoadCover = (
      <div className="flex-col f-1 jc-center ai-center">
        <Loading className="m-auto absolute" />
      </div>
    );

    const wrapInWindow = (content: React.ReactNode) => {
      return (
        <Window
          w={w}
          quickMenuProps={{
            tables,
            prgl,
            chartableSQL: undefined,
            dbs,
            setLinkMenu,
            onAddChart,
            myLinks: this.props.myLinks,
            childWindows: this.props.childWindows,
            show: childWindow ? { filter: true } : undefined,
          }}
          getMenu={this.getMenu}
        >
          {content}
        </Window>
      );
    };

    const cardOpts =
      w.options.viewAs?.type === "card" ? w.options.viewAs : undefined;
    let content: React.ReactNode = null;
    if (w.table_name && !db[w.table_name]) {
      content = showTableNotFound(w.table_name);
    } else if (loading || (w.table_name && !db[w.table_name])) {
      content = FirstLoadCover;
    } else {
      if (!rows) {
        return wrapInWindow(FirstLoadCover);
      }

      const cols = getTableCols({
        data: this.state.rows,
        windowWidth: this.ref?.getBoundingClientRect().width,
        prgl: this.props.prgl,
        w: this.d.w,
        onClickEditRow: this.onClickEditRow,
        barchartVals: this.state.barchartVals,
        suggestions: this.props.suggestions,
        columnMenuState: this.columnMenuState,
      });

      const { table_name: tableName } = w;

      let activeRowIndex = -1;
      if (activeRow?.row_filter) {
        activeRowIndex = rows.findIndex((r) =>
          matchObj(activeRow.row_filter, r),
        );
      }

      const tableHandler = db[tableName];
      const canInsert = Boolean(tableHandler?.insert);
      const pkeys = cols
        .map((c) => (c.show && c.info?.is_pkey ? c.info.name : undefined))
        .filter(isDefined);
      const rowKeys = pkeys.length ? pkeys : undefined;
      content = (
        <>
          <div
            className={`W_Table flex-col f-1 min-h-0 min-w-0 relative`}
            ref={(r) => {
              if (r) this.ref = r;
            }}
          >
            <ColumnMenu
              prgl={prgl}
              db={db}
              dbs={dbs}
              columnMenuState={this.columnMenuState}
              tables={tables}
              suggestions={this.props.suggestions}
              w={w}
            />
            {cols.length > 50 && !this.state.tooManyColumnsWarningWasShown && (
              <TooManyColumnsWarning
                w={w}
                onHide={() => {
                  this.setState({ tooManyColumnsWarningWasShown: true });
                }}
              />
            )}
            <NodeCountChecker
              parentNode={this.ref}
              dataAge={this.state.rowsLoaded}
            />

            {!!w.options.showFilters && (
              <div
                key={"W_Table_Filters"}
                className={`ai-center p-p5 bg-color-1 ${childWindow ? " bb b-color " : ""}`}
                style={{ zIndex: 1 }}
                title="Edit filters"
              >
                <SmartFilterBar
                  {...prgl}
                  methods={prgl.methods}
                  w={this.d.w ?? this.props.w}
                  rowCount={this.state.rowCount}
                  className=""
                  extraFilters={this.props.externalFilters}
                  hideSort={!cardOpts}
                  showInsertUpdateDelete={{
                    onSuccess: () => {
                      this.setState({ dataAge: Date.now() });
                    },
                  }}
                />
              </div>
            )}

            <W_Table_Content
              key={"W_Table_Content"}
              runningQuerySince={runningQuerySince}
            >
              {error && (
                <ErrorComponent
                  withIcon={true}
                  style={{ flex: "unset", padding: "2em" }}
                  error={error}
                />
              )}
              {childWindow ?
                childWindow
              : cardOpts ?
                <CardView
                  key={`${cardOpts.cardGroupBy}-${cardOpts.cardOrderBy}-${this.state.dataAge}`}
                  cols={cols}
                  state={this.state}
                  props={this.props}
                  w={this.d.w}
                  paginationProps={{ ...this.getPaginationProps() }}
                  onEditClickRow={this.onClickEditRow}
                  onDataChanged={() => {
                    this.setState({ dataAge: Date.now() });
                  }}
                />
              : w.options.viewAs?.type === "json" ?
                <CodeEditor
                  language="json"
                  value={JSON.stringify(
                    rows.map((r) =>
                      pickKeys(
                        r,
                        cols.filter((c) => c.show).map((c) => c.name),
                      ),
                    ),
                    null,
                    2,
                  )}
                  className="b-unset"
                />
              : <Table
                  style={{
                    flex: 1,
                    boxShadow: "unset",
                  }}
                  // bodyClass={(joinFilter? " active-brush " : "") + (!rows.length? "  " : "")}
                  // rowClass={((joinFilter && JSON.stringify(joinFilter) === joinFilterStr) ? " active-brush " : "") + (!rows.length ? "  " : "")}

                  maxCharsPerCell={w.options.maxCellChars ?? 500}
                  maxRowHeight={w.options.maxRowHeight}
                  rowStyle={joinFilter ? activeRowStyle : {}}
                  onSort={this.onSort}
                  onColumnReorder={this.onColumnReorder}
                  cols={prepareColsForRender(cols, this.getWCols, w)}
                  rows={rows}
                  rowKeys={rowKeys}
                  sort={w.sort || undefined}
                  tableStyle={{ borderRadius: "unset", border: "unset" }}
                  pagination={this.getPaginationProps()}
                  showSubLabel={w.options.showSubLabel}
                  activeRowStyle={activeRowStyle}
                  activeRowIndex={activeRowIndex}
                  onRowClick={this.state.onRowClick}
                  afterLastRowContent={
                    canInsert &&
                    !childWindow && (
                      <Btn
                        iconPath={mdiPlus}
                        data-command="dashboard.window.rowInsert"
                        data-key={w.table_name}
                        title={t.W_Table["Insert row"]}
                        className="shadow w-fit h-fit mt-1"
                        color="action"
                        variant={w.options.showFilters ? "outline" : "filled"}
                        style={{
                          position: "sticky",
                          left: "15px",
                          bottom: "15px",
                          zIndex: 1,
                        }}
                        onClick={async () => {
                          this.rowPanelRState.set({ type: "insert" });
                        }}
                      />
                    )
                  }
                />
              }
            </W_Table_Content>
          </div>

          {tableHandler && (
            <RowCard
              showR={this.rowPanelRState}
              rows={rows}
              prgl={prgl}
              tableName={tableName}
              tableHandler={tableHandler}
              onPrevOrNext={(newRowPanel) => {
                this.rowPanelRState.set(newRowPanel);
              }}
              onSuccess={() => {
                this.setState({ dataAge: Date.now() });
              }}
            />
          )}
        </>
      );
    }

    return wrapInWindow(content);
  }
}

export function kFormatter(num: number) {
  const abs = Math.abs(num);
  if (abs > 1e12 - 1)
    return Math.sign(num) * +(Math.abs(num) / 1e12).toFixed(1) + " T";
  if (abs > 1e9 - 1)
    return Math.sign(num) * +(Math.abs(num) / 1e9).toFixed(1) + " B";
  if (abs > 1e6 - 1)
    return Math.sign(num) * +(Math.abs(num) / 1e6).toFixed(1) + " m";
  if (abs > 999)
    return Math.sign(num) * +(Math.abs(num) / 1000).toFixed(1) + " k";
  return num.toString();
}
