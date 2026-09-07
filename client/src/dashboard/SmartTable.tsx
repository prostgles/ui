import {
  getSmartGroupFilter,
  type DetailedFilter,
  type DetailedFilterBase,
} from "@common/filterUtils";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import Loading from "@components/Loader/Loading";
import Popup, { type PopupProps } from "@components/Popup/Popup";
import type { PaginationProps } from "@components/Table/Pagination";
import { Table } from "@components/Table/Table";
import { type AnyObject, type SubscriptionHandler } from "prostgles-types";
import React from "react";
import type { Prgl } from "../App";
import { quickClone } from "../utils/utils";
import RTComp from "./RTComp";
import { SmartFilterBar } from "./SmartFilterBar/SmartFilterBar";
import { SmartForm } from "./SmartForm/SmartForm";
import { isNumericColumn } from "./W_SQL/getSQLResultTableColumns";
import type { ColumnSort } from "./W_Table/ColumnMenu/ColumnMenu";
import { getEditColumn } from "./W_Table/tableUtils/getEditColumn";
import { onRenderColumn } from "./W_Table/tableUtils/onRenderColumn";
import type { ProstglesColumn } from "./W_Table/W_Table";
import type { TableHandlerClient } from "prostgles-client";

type SmartTableProps = Pick<Prgl, "db" | "sql" | "tables" | "methods"> &
  Pick<PopupProps, "clickCatchStyle" | "positioning"> & {
    filter?: DetailedFilter[];
    fixedFilter?: AnyObject;
    tableName: string;
    tableCols?: ProstglesColumn[];
    selectedColumns?: string[];
    onClosePopup?: () => void;
    onClickRow?: (row?: AnyObject) => void;
    title?:
      | React.ReactNode
      | ((dataCounts: {
          totalRows: number;
          filteredRows: number;
        }) => React.ReactNode);
    titlePrefix?: string;
    showInsert?: boolean;
    allowEdit?: boolean;
    className?: string;
    noDataComponent?: React.ReactNode;
    onFilterChange?: (filter: DetailedFilter[]) => void;
    filterOperand?: "and" | "or";
    realtime?: { throttle?: number };
    initialSort?: ColumnSort[];
    hideFilters?: boolean;
  };

type S = {
  error?: unknown;
  rows: AnyObject[];
  sort: ColumnSort[];
  filter?: DetailedFilter[];
  editRowFilter?: DetailedFilterBase[];
  loadedData: boolean;
  filteredRows: number;
  columns?: ProstglesColumn[];
} & Pick<Required<PaginationProps>, "page" | "pageSize" | "totalRows">;

export default class SmartTable extends RTComp<SmartTableProps, S> {
  state: S = {
    rows: [],
    page: 0,
    pageSize: 25,
    totalRows: 0,
    filteredRows: 0,
    sort: this.props.initialSort ?? [],
    loadedData: false,
  };

  realtimeOpt?: {
    filter: AnyObject;
    realtime: SmartTableProps["realtime"];
  };
  realtime?: {
    filter?: AnyObject;
    sub: SubscriptionHandler;
  };

  get columns(): ProstglesColumn[] {
    if (this.state.columns) return this.state.columns;

    const {
      tableName,
      db,
      tableCols,
      tables,
      allowEdit = true,
      selectedColumns,
    } = this.props;
    const tableHandler = db[tableName] as TableHandlerClient | undefined;
    let _tableCols = tableCols ?? [];
    if (!tableCols) {
      const onClickEditRow = (editRowFilter) => {
        this.setState({ editRowFilter });
      };
      const table = tables.find((t) => t.name === tableName);
      const cols = table?.columns ?? [];
      _tableCols = cols
        .filter((c) => c.select)
        .map((c) => {
          const isNumeric = isNumericColumn(c);
          return {
            key: c.name,
            sortable: true,
            subLabel: c.data_type,
            ...c,
            /* Align numbers to right for an easier read */
            headerClassname: isNumeric ? " jc-end  " : " ",
            className: isNumeric ? " ta-right " : " ",
            onRender: onRenderColumn({
              column: c,
              table,
              tables,
              barchartVals: undefined,
              getValues: () => {
                return this.state.rows.map((r) => r[c.name]);
              },
            }),
          };
        });

      if (allowEdit && tableHandler && table) {
        _tableCols.unshift(
          getEditColumn({
            table,
            columnConfig: cols,
            tableHandler: tableHandler,
            onClickRow: onClickEditRow,
          }),
        );
      }
    }

    return _tableCols.filter(
      (c) => !selectedColumns || selectedColumns.includes(c.name),
    );
  }

  onMount() {
    void this.getData();
  }

  async onUnmount() {
    await this.realtime?.sub.unsubscribe();
  }

  loading = true;
  onDelta(deltaP: Partial<SmartTableProps> | undefined): void {
    const { tableName, db, realtime } = this.props;
    const filter = this.getQueryFilter();

    void (async () => {
      const tableHandler = db[tableName] as TableHandlerClient | undefined;
      if (
        tableHandler?.subscribe &&
        (JSON.stringify(realtime) !==
          JSON.stringify(this.realtimeOpt?.realtime) ||
          JSON.stringify(filter) !== JSON.stringify(this.realtimeOpt?.filter))
      ) {
        this.realtimeOpt = quickClone({ filter, realtime });
        await this.realtime?.sub.unsubscribe();
        this.realtime = realtime && {
          sub: await tableHandler.subscribe(
            filter,
            {
              select: "*",
              limit: 0,
              throttle: this.props.realtime?.throttle ?? 100,
            },
            () => {
              void this.getData();
            },
          ),
          filter,
        };
      } else if (deltaP && ("filter" in deltaP || "fixedFilter" in deltaP)) {
        void this.getData();
      }
    })();
  }

  get filter() {
    return this.props.filter ?? this.state.filter ?? [];
  }

  getQueryFilter = (filter = this.filter): AnyObject => {
    const queryFilter = getSmartGroupFilter(
      filter,
      undefined,
      this.props.filterOperand,
    );
    return this.props.fixedFilter ?
        { $and: [this.props.fixedFilter, queryFilter] }
      : queryFilter;
  };

  getData = async (
    filter: DetailedFilter[] = this.filter,
    sort: ColumnSort[] = this.state.sort,
    page: number = this.state.page,
    pageSize: PaginationProps["pageSize"] = this.state.pageSize,
  ) => {
    try {
      const { tableName, db } = this.props;
      const tableHandler = db[tableName] as TableHandlerClient | undefined;
      if (!tableHandler) return;

      const _filter = this.getQueryFilter(filter);
      const totalRows = await tableHandler.count(this.props.fixedFilter);
      const filteredRows = await tableHandler.count(_filter);
      const rows = await tableHandler.find(_filter, {
        limit: pageSize,
        orderBy: sort,
        offset: page * pageSize,
      });
      this.setState({
        rows,
        filter,
        sort,
        page,
        pageSize,
        totalRows,
        filteredRows,
        loadedData: true,
        error: undefined,
      });
    } catch (error) {
      this.setState({ error, loadedData: true });
    }
  };

  render() {
    const {
      tableName,
      db,
      tables,
      sql,
      onClickRow,
      onClosePopup,
      className,
      noDataComponent,
      titlePrefix,
      title,
      clickCatchStyle,
      positioning = "right-panel",
      hideFilters,
    } = this.props;
    const {
      filter,
      rows,
      sort,
      page,
      filteredRows,
      totalRows,
      editRowFilter,
      loadedData,
      error,
    } = this.state;
    const titleNode =
      typeof title === "function" ?
        title({ filteredRows, totalRows })
      : (title ?? (
          <span className="text-1 pxd-1 py-p5">
            {titlePrefix ?? tableName}
            <span>{` (${(filteredRows == totalRows ? [filteredRows] : [filteredRows, totalRows]).map((v) => v.toLocaleString()).join("/")})`}</span>
          </span>
        ));

    if (error) {
      return <ErrorComponent error={error} />;
    }

    if (!loadedData) {
      return <Loading />;
    }

    if (noDataComponent && !this.state.filter?.length && !rows.length) {
      return noDataComponent;
    }

    const tableCols = this.columns.slice(0);

    const content = (
      <FlexCol
        className={
          "SmartTable gap-0 f-1 min-h-0 relative " +
          (onClosePopup ? "" : className)
        }
      >
        {!onClosePopup && titleNode}
        {editRowFilter && (
          <SmartForm
            asPopup={true}
            confirmUpdates={true}
            db={db}
            sql={sql}
            methods={this.props.methods}
            tables={tables}
            tableName={tableName}
            rowFilter={editRowFilter}
            onSuccess={() => {
              void this.getData();
            }}
            onClose={() => {
              this.setState({ editRowFilter: undefined });
            }}
          />
        )}

        {!hideFilters && (
          <SmartFilterBar
            className="p-1 bg-color-2 min-h-fit"
            rowCount={totalRows}
            db={db}
            sql={sql}
            methods={this.props.methods}
            table_name={tableName}
            tables={tables}
            filter={filter}
            onChange={(filter) => {
              this.props.onFilterChange?.(filter);
              void this.getData(filter);
            }}
            onHavingChange={() => {
              console.warn("Having change not implemented");
            }}
            onSortChange={undefined}
            hideSort={true}
            showInsertUpdateDelete={{
              onSuccess: () => this.getData(),
            }}
          />
        )}
        <Table
          rows={rows}
          cols={tableCols}
          className={"pb -1 "}
          onRowClick={onClickRow}
          sort={sort}
          onSort={(sort) => {
            void this.getData(undefined, sort);
          }}
          onColumnReorder={(newCols) => {
            const nonComputedColumnNames = newCols
              .filter((c) => !(c.computed && c.key === "edit_row"))
              .map((c) => c.name);
            this.setState({
              columns: tableCols
                .slice(0)
                .sort(
                  (a, b) =>
                    nonComputedColumnNames.indexOf(a.name) -
                    nonComputedColumnNames.indexOf(b.name),
                ),
            });
          }}
          pagination={{
            page,
            pageSize: 10,
            totalRows,
            onPageChange: (page) => {
              void this.getData(undefined, undefined, page);
            },
            onPageSizeChange: (pageSize) => {
              void this.getData(undefined, undefined, undefined, pageSize);
            },
          }}
        />
      </FlexCol>
    );

    if (!onClosePopup) {
      return content;
    }

    return (
      <Popup
        title={titleNode}
        positioning={positioning}
        onClose={onClosePopup}
        contentStyle={{
          maxWidth: "calc(100vw - 20px)",
          padding: 0,
        }}
        clickCatchStyle={clickCatchStyle}
        contentClassName={className}
      >
        {content}
      </Popup>
    );
  }
}
