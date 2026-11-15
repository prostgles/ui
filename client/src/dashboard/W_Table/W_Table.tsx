import { mdiAlertOutline, mdiPlus, mdiRefresh } from "@mdi/js";
import type { AnyObject, ValidatedColumnInfo } from "prostgles-types";
import { pickKeys } from "prostgles-types";
import React, { useRef, useState } from "react";
import Loading from "@components/Loader/Loading";
import type { TableColumn, TableProps } from "@components/Table/Table";
import { Table } from "@components/Table/Table";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { ClickCatchOverlayZIndex } from "@components/ClickCatchOverlay";
import { FlexCol, FlexRow } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import type { ColumnSort } from "@common/ColumnConfig/ColumnConfig";
import { matchObj } from "@common/utils";
import type {
  WindowSyncItem,
  WorkspaceSyncItem,
} from "../Dashboard/dashboardUtils";
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import type { ProstglesQuickMenuProps } from "../W_QuickMenu";
import type { ChartValues } from "./tableUtils/fetchChartRangeValues";
import { createReactiveState } from "../../appUtils";
import { t } from "../../i18n/i18nUtils";
import { CodeEditor } from "../CodeEditor/CodeEditor";
import { SmartFilterBar } from "../SmartFilterBar/SmartFilterBar";
import { TableHeaderActions } from "../ActionPopup/TableHeaderActions";
import Window from "../Window/Window";
import { CardView } from "./CardView/CardView";
import { ColumnMenu, type ColumnMenuState } from "./ColumnMenu/ColumnMenu";
import { getTableRowIdentityColumns } from "./ColumnMenu/ColumnDisplayFormat/getTableIdentityColumns";
import { NodeCountChecker } from "./NodeCountChecker";
import { QuickFilterGroupsControl } from "./QuickFilterGroupsControl";
import { RowCard, type RowPanelProps } from "./RowCard";
import { W_TableMenu } from "./TableMenu/W_TableMenu";
import { TooManyColumnsWarning } from "./TooManyColumnsWarning";
import { W_Table_Content } from "./W_Table_Content";
import { useTableData } from "./getTableData/useTableData";
import { useTableWindow } from "./useTableWindow";
import type { OnClickEditRow } from "./tableUtils/getEditColumn";
import { getColumnsWithInfoAndWidth } from "./tableUtils/getColumnsWithInfoAndWidth";
import { getTableCols } from "./tableUtils/getTableCols";
import { getTableSelect } from "./tableUtils/getTableSelect";
import { prepareColsForRender } from "./tableUtils/prepareColsForRender";
import { getSort, updateWCols } from "./tableUtils/tableUtils";
import "./ProstglesTable.css";

const W_Table = (props: W_TableProps) => {
  const w = useTableWindow(props);
  const {
    setLinkMenu,
    joinFilter,
    activeRow,
    activeRowColor,
    prgl,
    childWindow,
    workspace,
  } = props;
  const { db, dbs, tables } = prgl;
  const tableName = w.table_name;
  const tableHandler = db[tableName];
  const {
    rows,
    barchartVals,
    runningQuerySince,
    error,
    setError,
    refresh,
    rowCount,
    pagination,
  } = useTableData({ ...props, w });
  const tableRef = useRef<HTMLDivElement>(null);
  const [tooManyColumnsWarningWasShown, setTooManyColumnsWarningWasShown] =
    useState(false);
  const [rowPanelState] = useState(() =>
    createReactiveState<RowPanelProps | undefined>(undefined),
  );
  const [columnMenuState] = useState<ColumnMenuState>(() =>
    createReactiveState<ReturnType<ColumnMenuState["get"]>>(undefined),
  );
  const rowsLoaded = React.useMemo(() => rows && Date.now(), [rows]);

  const onClickEditRow: OnClickEditRow = (
    filter,
    siblingData,
    rowIndex,
    fixedUpdateData,
  ) => {
    rowPanelState.set({
      type: "update",
      rowIndex,
      filter,
      siblingData,
      fixedUpdateData,
    });
  };
  const getWCols = () =>
    getColumnsWithInfoAndWidth(tables, w, rows, tableRef.current?.offsetWidth);
  const getMenu = (window: WindowSyncItem<"table">, onClose: VoidFunction) => {
    if (!tables.some(({ name }) => name === window.table_name))
      return <ErrorComponent error="Table not found" />;
    if (!window.columns) return <ErrorComponent error="Columns not defined" />;
    return (
      <W_TableMenu
        prgl={prgl}
        workspace={workspace}
        w={window}
        suggestions={props.suggestions}
        onClose={onClose}
        externalFilters={props.externalFilters}
        joinFilter={joinFilter}
      />
    );
  };
  const onSort = async (sort: ColumnSort[]) => {
    try {
      const orderBy = getSort(tables, { ...w, sort }) as ColumnSort[];
      const { select } = await getTableSelect(
        w,
        tables,
        db,
        {},
        true,
        prgl.methods,
      );
      await tableHandler?.find?.({}, { select, limit: 0, orderBy });
      setError(undefined);
      await w.$update({ sort });
    } catch (error) {
      setError(error);
    }
  };
  const onColumnReorder = (newColumns: ProstglesColumn[]) => {
    const columnNames = newColumns
      .filter((column) => !(column.computed && column.key === "edit_row"))
      .map(({ name }) => name);
    const columns = w.columns?.toSorted(
      (first, second) =>
        columnNames.indexOf(first.name) - columnNames.indexOf(second.name),
    );
    void updateWCols(w, columns);
  };
  const onRowClick: TableProps<ColumnSort>["onRowClick"] = (row, event) => {
    const hasNonComputedFields = w.columns?.some(
      (column) =>
        !column.computedConfig && !column.format && column.name in (row ?? {}),
    );
    props.onClickRow?.(hasNonComputedFields ? row : undefined, event);
  };
  const showTableNotFound = (name: string) => (
    <div
      className="p-2 flex-row ai-center text-danger"
      data-command="W_Table.TableNotFound"
    >
      <Icon path={mdiAlertOutline} className="mr-p5" />
      Table {JSON.stringify(name)} not found
    </div>
  );
  const activeRowStyle: React.CSSProperties =
    !runningQuerySince ? { background: activeRowColor } : {};

  const FirstLoadCover = (
    <div className="flex-col f-1 jc-center ai-center">
      <Loading className="m-auto absolute" />
    </div>
  );

  const isFixedLayout = workspace.layout_mode === "fixed";
  const wrapInWindow = (content: React.ReactNode) => {
    return (
      <Window
        w={w}
        childWindow={childWindow}
        tables={tables}
        layoutMode={workspace.layout_mode ?? "editable"}
        quickMenuProps={{
          chartableSQL: undefined,
          dbs,
          setLinkMenu,
          myLinks: props.myLinks,
          childWindows: props.childWindows,
          getLinksAndWindows: props.getLinksAndWindows,
          show: isFixedLayout ? { filter: true } : undefined,
          headerSearch:
            isFixedLayout ? { extraFilters: props.externalFilters } : undefined,
        }}
        getMenu={getMenu}
      >
        {content}
      </Window>
    );
  };

  const cardOpts =
    w.options.viewAs?.type === "card" ? w.options.viewAs : undefined;
  const showFilterBar =
    w.options.showFilters &&
    (workspace.layout_mode !== "fixed" ||
      !!w.filter.length ||
      !!w.having.length);
  let content: React.ReactNode = null;
  if (tableName && !tableHandler) {
    content = showTableNotFound(tableName);
  } else if (!rows) {
    content = FirstLoadCover;
  } else {
    const cols = getTableCols({
      data: rows,
      windowWidth: tableRef.current?.getBoundingClientRect().width,
      tables,
      methods: prgl.methods,
      db,
      sql: prgl.sql,
      w,
      onClickEditRow,
      barchartVals,
      suggestions: props.suggestions,
      columnMenuState,
      opts: {
        noRightBorder: isFixedLayout,
      },
    });

    let activeRowIndex = -1;
    if (activeRow?.row_filter) {
      activeRowIndex = rows.findIndex((r) => matchObj(activeRow.row_filter, r));
    }

    const canInsert = Boolean(tableHandler?.insert);
    const showInsertButton = canInsert && w.options.hideInsertButton !== true;
    const insertRowControls = showInsertButton && !childWindow && (
      <FlexRow
        className="p-1"
        style={{
          position: "sticky",
          left: 0,
          bottom: 0,
          /** Below the filter search clickcatch */
          zIndex: ClickCatchOverlayZIndex - 1,
        }}
      >
        <Btn
          iconPath={mdiPlus}
          data-command="dashboard.window.rowInsert"
          data-key={tableName}
          title={t.W_Table["Insert row"]}
          className="shadow w-fit h-fit"
          color="action"
          variant={w.options.showFilters ? "outline" : "filled"}
          onClick={() => {
            rowPanelState.set({ type: "insert" });
          }}
        />
        <NodeCountChecker
          parentNode={tableRef.current ?? undefined}
          dataAge={rowsLoaded}
        />
      </FlexRow>
    );
    const table = tables.find(({ name }) => name === tableName);
    const rowKeys =
      table ?
        getTableRowIdentityColumns(
          table,
          table.columns.map(({ name }) => ({
            ...w.columns?.find((column) => column.name === name),
            name,
            show: rows.every((row) => row[name] != null),
          })),
        ).map(({ name }) => name)
      : undefined;
    content = (
      <>
        <div
          className={`W_Table flex-col f-1 min-h-0 min-w-0 relative`}
          ref={tableRef}
        >
          <ColumnMenu
            columnMenuState={columnMenuState}
            suggestions={props.suggestions}
            w={w}
          />
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

          <TableHeaderActions
            className="p-p5"
            methods={prgl.methods}
            tableName={tableName}
          />
          {showFilterBar && (
            <FlexCol
              key={"W_Table_Filters"}
              className={`gap-p5 p-p5 bg-color-0 ${childWindow ? " bb b-color " : ""}`}
              style={{
                /** Ensure:
                 * - it covers the attached timechart layer opts button
                 * - stays behind fixed mode header search bar
                 * */
                zIndex: ClickCatchOverlayZIndex - (isFixedLayout ? 1 : 0),
              }}
              title="Edit filters"
            >
              <SmartFilterBar
                {...prgl}
                methods={prgl.methods}
                w={w}
                rowCount={rowCount}
                className=""
                extraFilters={props.externalFilters}
                hideSort={!cardOpts}
                filtersOnly={isFixedLayout}
                showInsertUpdateDelete={{ onSuccess: refresh }}
              />
            </FlexCol>
          )}
          <QuickFilterGroupsControl {...props} w={w} />

          <W_Table_Content
            key={"W_Table_Content"}
            runningQuerySince={runningQuerySince}
          >
            <ErrorComponent
              withIcon={true}
              style={{ flex: "unset", padding: "2em" }}
              error={error}
            />
            {!!error && (
              <Btn iconPath={mdiRefresh} onClick={refresh}>
                Retry
              </Btn>
            )}

            {cardOpts ?
              <CardView
                key={`${cardOpts.cardGroupBy}-${cardOpts.cardOrderBy}`}
                cols={cols}
                state={{ rows }}
                props={props}
                w={w}
                cardOpts={cardOpts}
                tableHandler={tableHandler!}
                paginationProps={pagination}
                afterLastRowContent={insertRowControls}
                onEditClickRow={onClickEditRow}
                onDataChanged={refresh}
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

                maxCharsPerCell={w.options.maxCellChars ?? 500}
                maxRowHeight={w.options.maxRowHeight}
                rowStyle={joinFilter ? activeRowStyle : {}}
                onSort={onSort}
                onColumnReorder={onColumnReorder}
                cols={prepareColsForRender(cols, getWCols, w)}
                rows={rows}
                rowKeys={rowKeys}
                sort={w.sort || undefined}
                tableStyle={{ borderRadius: "unset", border: "unset" }}
                pagination={pagination}
                showSubLabel={w.options.showSubLabel}
                activeRowStyle={activeRowStyle}
                activeRowIndex={activeRowIndex}
                onRowClick={props.onClickRow ? onRowClick : undefined}
                afterLastRowContent={insertRowControls}
              />
            }
          </W_Table_Content>
        </div>

        {tableHandler && (
          <RowCard
            showR={rowPanelState}
            rows={rows}
            tableName={tableName}
            tableHandler={tableHandler}
            onPrevOrNext={(newRowPanel) => {
              rowPanelState.set(newRowPanel);
            }}
            onSuccess={refresh}
          />
        )}
      </>
    );
  }

  return wrapInWindow(content);
};

export default W_Table;

export type W_TableProps = Omit<CommonWindowProps, "w"> & {
  w: WindowSyncItem<"table">;
  setLinkMenu: ProstglesQuickMenuProps["setLinkMenu"];
  childWindow: { node: React.ReactNode; w: WindowSyncItem } | undefined;
  onClickRow?: TableProps<ColumnSort>["onRowClick"];
  filter?: any;
  joinFilter?: AnyObject;
  externalFilters: AnyObject[];
  activeRow?: ActiveRow;
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
  barChart?: {
    values: any[];
  };
};

export type MinMax<T = number> = {
  min: T;
  max: T;
};
/**
 * Used for cell timechart and barchart
 */
export type MinMaxVals = ChartValues;

export type ProstglesColumn = TableColumn & { computed?: boolean } & Pick<
    ValidatedColumnInfo,
    "name" | "tsDataType" | "udt_name" | "filter"
  >;
