import React from "react";
import type { W_SQLProps, W_SQLState } from "./W_SQL";
import { CSVRender } from "./CSVRender";
import { CodeEditor } from "../CodeEditor/CodeEditor";
import { Table } from "../../components/Table/Table";
import type { WindowData } from "../Dashboard/dashboardUtils";
import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import { onRenderColumn } from "../W_Table/tableUtils/onRenderColumn";
import type { ColumnSort } from "../W_Table/ColumnMenu/ColumnMenu";

type W_SQLResultsProps = Pick<
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
    onSort: (newSort: ColumnSort[]) => any;
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
  const {
    commandResult = undefined,
    rowCount = undefined,
    info = undefined,
  } = activeQuery?.state === "ended" ? activeQuery : {};
  const hideResults =
    !childWindow &&
    ((o.hideTable && !notices && !notifEventSub) ||
      (!rows.length && !sqlResult && activeQuery?.state !== "running"));

  if (activeQuery?.state === "running" && !rows.length) {
    return null;
  }
  const { renderMode = "table", maxCharsPerCell } = w.sql_options;

  const paginatedRows =
    renderMode === "table" ?
      rows.slice(page * pageSize, (page + 1) * pageSize)
    : rows;
  return (
    <div
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
      : <Table
          maxCharsPerCell={maxCharsPerCell || 1000}
          sort={sort}
          onSort={onSort}
          showSubLabel={true}
          cols={cols.map((c, i) => ({
            ...c,
            key: i,
            label: c.name,
            filter: false,
            /* Align numbers to right for an easier read */
            headerClassname: c.tsDataType === "number" ? " jc-end  " : " ",
            className: c.tsDataType === "number" ? " ta-right " : " ",
            onRender: onRenderColumn({
              c: { ...c, name: i.toString(), format: undefined },
              table: undefined,
              tables,
              barchartVals: undefined,
              maxCellChars: maxCharsPerCell || 1000,
              maximumFractionDigits: 12,
            }),
            onResize: async (width) => {
              const newCols = cols.map((_c) => {
                if (_c.key === c.key) {
                  _c.width = width;
                }
                return _c;
              });
              onResize(newCols);
            },
          }))}
          rows={paginatedRows}
          style={{ flex: 1, boxShadow: "unset" }}
          tableStyle={{
            borderRadius: "unset",
            border: "unset",
            ...((info?.command || "").toLowerCase() === "explain" ?
              { whiteSpace: "pre" }
            : {}),
          }}
          pagination={
            !isSelect ? undefined : (
              {
                page,
                pageSize,
                totalRows: rowCount,
                onPageChange,
                onPageSizeChange,
              }
            )
          }
        />
      }
    </div>
  );
};
