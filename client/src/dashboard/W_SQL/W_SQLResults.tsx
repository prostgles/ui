import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import React, { useMemo, useState } from "react";
import type { PaginationProps } from "../../components/Table/Pagination";
import { Table } from "../../components/Table/Table";
import { CodeEditor } from "../CodeEditor/CodeEditor";
import type { WindowData } from "../Dashboard/dashboardUtils";
import type { ColumnSortSQL } from "../W_Table/ColumnMenu/ColumnMenu";
import { TooManyColumnsWarning } from "../W_Table/TooManyColumnsWarning";
import { CSVRender } from "./CSVRender";
import { getSQLResultTableColumns } from "./getSQLResultTableColumns";
import type { W_SQLProps, W_SQLState } from "./W_SQL";

export type W_SQLResultsProps = Pick<
  W_SQLState,
  | "sqlResult"
  | "rows"
  | "notifEventSub"
  | "notices"
  | "cols"
  | "activeQuery"
  | "sort"
  | "page"
  | "pageSize"
  | "isSelect"
> &
  Pick<W_SQLProps, "childWindow" | "tables"> & {
    w: SyncDataItem<Required<WindowData<"sql">>, true>;
    onResize: (newCols: W_SQLState["cols"]) => void;
    onSort: (newSort: ColumnSortSQL[]) => any;
    onPageChange: (newPage: number) => any;
    onPageSizeChange: (newPageSize: W_SQLState["pageSize"]) => any;
  };

export const W_SQLResults = (props: W_SQLResultsProps) => {
  const {
    sqlResult,
    notifEventSub,
    notices,
    rows = [],
    cols = [],
    activeQuery,
    childWindow,
    sort,
    w,
    tables,
    page,
    pageSize,
    onSort,
    onResize,
    isSelect,
    onPageChange,
    onPageSizeChange,
  } = props;
  const o: WindowData<"sql">["options"] = w.options;
  const { renderMode = "table", maxCharsPerCell } = w.sql_options;
  const {
    commandResult = undefined,
    rowCount = undefined,
    info = undefined,
  } = activeQuery?.state === "ended" ? activeQuery : {};
  const hideResults =
    !childWindow &&
    ((o.hideTable && !notices && !notifEventSub) ||
      (!rows.length && !sqlResult && activeQuery?.state !== "running"));

  const isExplainResult = (info?.command || "").toLowerCase() === "explain";
  const [tooManyColumnsWarningWasShown, setTooManyColumnsWarningWasShown] =
    useState(false);

  const tableColumns = useMemo(() => {
    return getSQLResultTableColumns({
      cols,
      tables,
      maxCharsPerCell,
      onResize,
    });
  }, [cols, tables, maxCharsPerCell, onResize]);
  // if (activeQuery?.state === "running" && !rows.length) {
  //   return null;
  // }

  const pagination = useMemo(() => {
    if (!isSelect) return;
    return {
      page,
      pageSize,
      totalRows: rowCount,
      onPageChange,
      onPageSizeChange,
    } satisfies PaginationProps;
  }, [isSelect, onPageChange, onPageSizeChange, page, pageSize, rowCount]);

  const paginatedRows =
    renderMode === "table" ?
      rows.slice(page * pageSize, (page + 1) * pageSize)
    : rows;
  return (
    <div
      data-command="W_SQLResults"
      className={
        "W_SQLResults flex-col oy-auto relative bt b-color " +
        (commandResult ? " f-0 " : " f-1 ") +
        (hideResults ? " hidden " : "")
      }
    >
      {notices ?
        <div className="p-1 ws-pre text-1">
          {notices
            .slice(0)
            .map((n) => JSON.stringify(n, null, 2))
            .join("\n")}
        </div>
      : commandResult ?
        <div className="p-1 ">{commandResult}</div>
      : childWindow ?
        childWindow
      : renderMode === "csv" ?
        <CSVRender cols={cols} rows={rows} />
      : renderMode === "JSON" ?
        <CodeEditor
          language="json"
          value={JSON.stringify(
            rows.map((rowValues) =>
              cols.reduce((a, v, i) => ({ ...a, [v.name]: rowValues[i] }), {}),
            ),
            null,
            2,
          )}
        />
      : <>
          {!tooManyColumnsWarningWasShown && (
            <TooManyColumnsWarning
              w={w}
              numberOfCols={cols.length}
              numberOfRows={rows.length}
              onHide={() => {
                setTooManyColumnsWarningWasShown(true);
              }}
            />
          )}

          <Table
            maxCharsPerCell={maxCharsPerCell || 1000}
            sort={sort}
            onSort={onSort}
            enableExperimentalVirtualisation={true}
            showSubLabel={true}
            cols={tableColumns}
            rows={paginatedRows}
            style={{ flex: 1, boxShadow: "unset" }}
            tableStyle={{
              borderRadius: "unset",
              border: "unset",
              ...(isExplainResult && {
                whiteSpace: "pre",
              }),
            }}
            pagination={pagination}
          />
        </>
      }
    </div>
  );
};
