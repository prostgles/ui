import React from "react";
import Loading from "../components/Loading";
import Popup from "../components/Popup/Popup";
import { Table } from "../components/Table/Table";
import type { ColumnSort } from "./W_Table/ColumnMenu/ColumnMenu";
import type { ProstglesColumn } from "./W_Table/W_Table";
import RTComp from "./RTComp";
import { getSmartGroupFilter } from "./SmartFilter/SmartFilter";
import type {
  DetailedFilterBase,
  SmartGroupFilter,
} from "../../../commonTypes/filterUtils";
import { SmartFilterBar } from "./SmartFilterBar/SmartFilterBar";
import SmartForm from "./SmartForm/SmartForm";
import ErrorComponent from "../components/ErrorComponent";
import { getEditColumn } from "./W_Table/tableUtils/getEditColumn";
import type { AnyObject, SubscriptionHandler } from "prostgles-types";
import { onRenderColumn } from "./W_Table/tableUtils/onRenderColumn";
import type { Prgl } from "../App";
import { quickClone } from "../utils";
import type { PaginationProps } from "../components/Table/Pagination";
import { FlexCol } from "../components/Flex";

type SmartTableProps = Pick<Prgl, "db" | "tables" | "methods" | "theme"> & {
  filter?: SmartGroupFilter;
  tableName: string;
  tableCols?: ProstglesColumn[];
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
  onFilterChange?: (filter: SmartGroupFilter) => void;
  filterOperand?: "and" | "or";
  realtime?: { throttle?: number };
};

type S = {
  error?: any;
  rows: AnyObject[];
  sort: ColumnSort[];
  filter?: SmartGroupFilter;
  editRowFilter?: DetailedFilterBase[];
  loadedData: boolean;
  filteredRows: number;
  columns?: ProstglesColumn[];
} & Pick<Required<PaginationProps>, "page" | "pageSize" | "totalRows">;

export default class SmartTable extends RTComp<SmartTableProps, S> {
  state: S = {
    rows: [],
    page: 1,
    pageSize: 25,
    totalRows: 0,
    filteredRows: 0,
    sort: [],
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

    const { tableName, db, tableCols, tables, allowEdit = true } = this.props;
    const tableHandler = db[tableName];
    let _tableCols = tableCols ?? [];
    if (!tableCols) {
      const onClickEditRow = (editRowFilter) => {
        this.setState({ editRowFilter });
      };
      const table = tables.find((t) => t.name === tableName);
      const cols = table?.columns ?? [];
      _tableCols = cols
        .filter((c) => c.select)
        .map((c) => ({
          key: c.name,
          sortable: true,
          subLabel: c.data_type,
          ...c,
          /* Align numbers to right for an easier read */
          headerClassname: c.tsDataType === "number" ? " jc-end  " : " ",
          className: c.tsDataType === "number" ? " ta-right " : " ",
          onRender: onRenderColumn({
            c,
            table,
            tables,
            barchartVals: undefined,
          }),
        }));

      if (allowEdit && tableHandler) {
        _tableCols.unshift(
          getEditColumn({
            columns: cols,
            tableHandler: tableHandler as any,
            onClickRow: onClickEditRow,
          }),
        );
      }
    }

    return _tableCols;
  }

  async onMount() {
    this.getData();
  }

  async onUnmount() {
    await this.realtime?.sub.unsubscribe();
  }

  loading = true;
  onDelta(deltaP: Partial<SmartTableProps> | undefined): void {
    const { filter = {}, tableName, db, realtime } = this.props;

    (async () => {
      const tableHandler = db[tableName];
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
              select: "",
              limit: 0,
              throttle: this.props.realtime?.throttle ?? 100,
            },
            () => {
              this.getData();
            },
          ),
          filter,
        };
      } else if (deltaP?.filter) {
        this.getData();
      }
    })();
  }

  get filter() {
    return this.props.filter ?? this.state.filter ?? [];
  }

  getData = async (
    filter: SmartGroupFilter = this.filter,
    sort: ColumnSort[] = this.state.sort,
    page: number = this.state.page,
    pageSize: PaginationProps["pageSize"] = this.state.pageSize,
  ) => {
    try {
      const { tableName, db } = this.props;
      const tableHandler = db[tableName];
      if (!tableHandler) return;

      const _filter = getSmartGroupFilter(
        filter,
        undefined,
        this.props.filterOperand,
      );
      const totalRows = await tableHandler.count!();
      const filteredRows = await tableHandler.count!(_filter);
      const rows = await tableHandler.find!(_filter, {
        limit: pageSize,
        orderBy: sort as any,
        offset: (page - 1) * pageSize,
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
      onClickRow,
      onClosePopup,
      className,
      noDataComponent,
      titlePrefix,
      title,
      theme,
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
          <span className="text-1 px-1 py-p5">
            {titlePrefix ?? tableName}
            <span>{` (${filteredRows.toLocaleString()}/${totalRows.toLocaleString()})`}</span>
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
          "gap-0 f-1 min-h-0 relative " + (onClosePopup ? "" : className)
        }
      >
        {!onClosePopup && titleNode}
        {editRowFilter && (
          <SmartForm
            asPopup={true}
            theme={this.props.theme}
            confirmUpdates={true}
            hideChangesOptions={true}
            db={db}
            methods={this.props.methods}
            tables={tables}
            tableName={tableName}
            rowFilter={editRowFilter}
            onSuccess={() => {
              this.getData();
            }}
            onClose={() => {
              this.setState({ editRowFilter: undefined });
            }}
          />
        )}

        <SmartFilterBar
          theme={theme}
          className="p-1 bg-color-2 min-h-fit"
          rowCount={totalRows}
          db={db}
          methods={this.props.methods}
          table_name={tableName}
          tables={tables}
          filter={filter}
          onChange={(filter) => {
            this.props.onFilterChange?.(filter);
            this.getData(filter);
          }}
          onHavingChange={() => {
            console.warn("Having change not implemented");
          }}
          hideSort={true}
          showInsertUpdateDelete={{
            onSuccess: () => this.getData(),
          }}
        />
        <Table
          rows={rows}
          cols={tableCols}
          className={"pb -1 "}
          onRowClick={onClickRow}
          sort={sort}
          onSort={(sort) => {
            this.getData(undefined, sort);
          }}
          onColumnReorder={(newCols) => {
            const nIdxes = newCols
              .filter((c) => !(c.computed && c.key === "edit_row"))
              .map((c) => c.name);
            this.setState({
              columns: tableCols
                .slice(0)
                .sort(
                  (a, b) => nIdxes.indexOf(a.name) - nIdxes.indexOf(b.name),
                ),
            });
          }}
          pagination={{
            page,
            pageSize: 10,
            totalRows,
            onPageChange: (page) => {
              this.getData(undefined, undefined, page);
            },
            onPageSizeChange: (pageSize) => {
              this.getData(undefined, undefined, undefined, pageSize);
            },
          }}
        />
      </FlexCol>
    );

    if (!onClosePopup) return content;

    return (
      <Popup
        title={titleNode}
        positioning="right-panel"
        onClose={onClosePopup}
        contentStyle={{
          maxWidth: "calc(100vw - 20px)",
          padding: 0,
        }}
        contentClassName={className}
      >
        {content}
      </Popup>
    );
  }
}
