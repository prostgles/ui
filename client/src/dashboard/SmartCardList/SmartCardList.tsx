import type { CardMode } from "@common/ColumnConfig/cardLayout";
import React, { useEffect, useMemo, useRef } from "react";

import type {
  DetailedFilter,
  GroupedDetailedFilter,
} from "@common/filterUtils";
import ErrorComponent from "@components/ErrorComponent";
import { classOverride } from "@components/Flex";
import Loading from "@components/Loader/Loading";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { Pagination, usePagination } from "@components/Table/Pagination";
import type {
  AnyObject,
  FilterItem,
  ValidatedColumnInfo,
} from "prostgles-types";
import FlipMove from "react-flip-move";
import type { Prgl } from "../../App";
import type { TestSelectors } from "../../Testing";
import type { FieldConfig, SmartCardProps } from "../SmartCard/SmartCard";
import { SmartCard } from "../SmartCard/SmartCard";
import type { InsertButtonProps } from "../SmartForm/InsertButton";
import type { SmartFormProps } from "../SmartForm/SmartForm";
import type { ColumnSort } from "@common/ColumnConfig/ColumnConfig";
import { SmartCardListHeaderControls } from "./SmartCardListHeaderControls";
import { useSmartCardListState } from "./useSmartCardListState";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import { CardItemTitle } from "../W_Table/CardView/CardItem/CardItemTitle";
import { usePromise } from "prostgles-client";
import { getTableCardFieldConfigs } from "../SmartForm/SmartFormField/getTableCardFieldConfigs";
import { scrollIntoViewIfNeeded } from "src/utils/utils";

export type SmartCardListProps<T extends AnyObject = AnyObject> = Pick<
  Prgl,
  "db" | "tables" | "methods" | "sql"
> & {
  tableName:
    | string
    | {
        sqlQuery: string;
        dataAge?: string | number;
        args?: Record<string, any>;
      };
  columns?: ValidatedColumnInfo[];

  className?: string;
  style?: React.CSSProperties;
  variant?: "row" | "col" | "row-wrap";
  cardMode?: CardMode;
  bordered?: boolean;
  flat?: boolean;

  hideColumns?: string[];

  /**
   * Used in:
   * Changing how table columns are displayed
   * Displaying additional custom computed columns
   */
  fieldConfigs?: FieldConfig<T>[];

  title?: React.ReactNode | ((args: { count: number }) => React.ReactNode);
  searchPlaceholder?: string | ((args: { count: number }) => string);
  fixedControls?: boolean;
  scrollToRow?: { key: string; index: number };
  getRowFooter?: (row: T) => React.ReactNode | React.JSX.Element;
  onRowClick?: (row: T) => void;
  onRowHover?: (row: T | undefined) => void;
  isRowSelected?: (row: T) => boolean;
  isRowHovered?: (row: T) => boolean;
  selectedRowStyle?: React.CSSProperties;
  hoveredRowStyle?: React.CSSProperties;
  footer?: React.ReactNode;

  /**
   * If true then will not display fields with null values
   * */
  excludeNulls?: boolean;

  tables: DBSchemaTableWJoins[];
  popupFixedStyle?: React.CSSProperties;
  noDataComponent?: React.ReactNode;
  /**
   * If no data AND set to "hide-all" will return only noDataComponent (or nothing)
   * */
  noDataComponentMode?: "hide-all";

  btnColor?: "gray";

  showTopBar?:
    | boolean
    | {
        leftContent?: React.ReactNode;
        insert?:
          | true
          | Pick<
              InsertButtonProps,
              "buttonProps" | "defaultData" | "fixedData"
            >;
        sort?: true;
      };
  headerControlsTarget?: HTMLElement | null;
  rowProps?: {
    style?: React.CSSProperties;
    className?: string;
  };
  onSuccess?: SmartFormProps["onSuccess"];
  enableListAnimations?: boolean;
  getActions?: SmartCardProps<T>["getActions"];
  onClose?: VoidFunction;
  /**
   * Show top N records
   * Defaults to 20
   */
  limit?: number;
  filter?:
    | AnyObject
    | FilterItem<T>
    | { $and: FilterItem<T>[] }
    | { $or: FilterItem<T>[] };
  searchFilter?: (DetailedFilter | GroupedDetailedFilter)[];
  orderBy?: ColumnSort | ColumnSort[];
  realtime?: boolean;
  throttle?: number;
  orderByFields?: string[];
  showEdit?: boolean;
  onSetData?: (items: AnyObject[]) => void;
} & Pick<TestSelectors, "data-command">;

export const SmartCardList = <T extends AnyObject>(
  props: SmartCardListProps<T>,
) => {
  const {
    db,
    methods,
    tables,
    tableName,
    fieldConfigs,
    hideColumns,
    cardMode = "summary",
  } = props;
  const table = tables.find((table) => table.name === tableName);
  const useTableCard = !fieldConfigs && !!table?.card;
  const tableFieldConfigs = usePromise(async () => {
    if (!useTableCard) return;
    return getTableCardFieldConfigs({
      table,
      tables,
      db,
      methods,
      cardMode,
      hideColumns,
    });
  }, [useTableCard, table, tables, db, methods, cardMode, hideColumns]);

  if (useTableCard && !tableFieldConfigs) return <Loading />;

  return (
    <SmartCardListContent
      {...props}
      fieldConfigs={
        useTableCard ? (tableFieldConfigs as FieldConfig<T>[]) : fieldConfigs
      }
      orderBy={props.orderBy ?? table?.sort}
    />
  );
};

const SmartCardListContent = <T extends AnyObject>(
  props: SmartCardListProps<T>,
) => {
  const {
    tableName,
    db,
    methods,
    tables,
    className = "",
    style = {},
    popupFixedStyle,
    fieldConfigs: _fieldConfigs,
    getRowFooter,
    excludeNulls,
    footer,
    rowProps,
    noDataComponentMode,
    noDataComponent,
    onSuccess,
    enableListAnimations = false,
    getActions,
    limit = 25,
    fixedControls,
    scrollToRow,
    sql,
    "data-command": dataCommand = "SmartCardList",
  } = props;

  const paginationState = usePagination(limit);

  const state = useSmartCardListState({
    ...props,
    fieldConfigs: _fieldConfigs as FieldConfig<AnyObject>[],
    limit: paginationState.limit,
    offset: paginationState.offset,
  });
  const { columns, loading, items, error, loaded, totalRows, tableControls } =
    state;
  const { keyCols } = useGetRowKeyCols(columns ?? [], items?.[0] ?? {});
  const rowElementsRef = useRef(new Map<string, HTMLDivElement>());
  const revealedRowRef = useRef<SmartCardListProps<T>["scrollToRow"]>();
  const { limit: pageSize, onPageChange } = paginationState;
  const setLocalFilter = tableControls?.setLocalFilter;
  useEffect(() => {
    if (!scrollToRow) return;
    setLocalFilter?.(undefined);
    onPageChange(Math.floor(scrollToRow.index / pageSize));
  }, [scrollToRow, pageSize, onPageChange, setLocalFilter]);
  useEffect(() => {
    if (!scrollToRow || revealedRowRef.current === scrollToRow) return;
    const requestedRow = items?.[scrollToRow.index - paginationState.offset];
    if (
      !requestedRow ||
      getKeyForRowData(requestedRow, keyCols) !== scrollToRow.key
    )
      return;
    const rowElement = rowElementsRef.current.get(scrollToRow.key);
    if (!rowElement) return;
    scrollIntoViewIfNeeded(rowElement);
    revealedRowRef.current = scrollToRow;
  }, [scrollToRow, items, paginationState.offset, keyCols]);

  const smartCardListStyle = useSmartCardListStyle(style);
  const flatCards =
    props.flat ??
    ((props.cardMode ?? "summary") === "summary" &&
      _fieldConfigs?.some(
        (field) => typeof field !== "string" && field.cardHeader?.isTitle,
      ));

  if (error) return <ErrorComponent error={error} />;

  if (!columns || !items) return <Loading />;

  if (!loaded) {
    return null;
  }

  /** Used to prevent subsequent flickers during filter change if no items */
  const showNoDataComponent = noDataComponent && !items.length;
  if (showNoDataComponent && noDataComponentMode === "hide-all") {
    return noDataComponent;
  }

  return (
    <ScrollFade
      className={classOverride(
        `SmartCardList ${fixedControls ? "o-hidden" : "o-auto"} flex-col gap-p5 relative max-w-full`,
        className,
      )}
      data-command={dataCommand}
      style={smartCardListStyle}
    >
      {loading && <Loading variant="cover" />}

      {tableControls && (
        <SmartCardListHeaderControls
          {...(props as SmartCardListProps)}
          itemsLength={items.length}
          totalRows={totalRows}
          columns={columns}
          tableControls={state.tableControls}
        />
      )}
      <MaybeFlipMove
        className={"flex-col relative " + (flatCards ? "gap-0" : "gap-p5")}
        flipMove={enableListAnimations}
        scrollable={fixedControls}
      >
        {showNoDataComponent ?
          noDataComponent
        : items.map((defaultData, index) => {
            const key = getKeyForRowData(defaultData, keyCols);
            const rowIsSelected = props.isRowSelected?.(defaultData as T);
            const rowIsHovered = props.isRowHovered?.(defaultData as T);
            return (
              /** SmartCard wrapped in div to ensure MaybeFlipMove works */
              <div
                className={classOverride(
                  `relative ${props.onClose ? "flex-col min-h-0" : ""}`,
                  props.onRowClick ? "pointer" : "",
                )}
                key={key}
                ref={
                  scrollToRow &&
                  ((element) => {
                    if (element) rowElementsRef.current.set(key, element);
                    else rowElementsRef.current.delete(key);
                  })
                }
                data-key={key}
                onPointerEnter={
                  props.onRowHover &&
                  (() => props.onRowHover?.(defaultData as T))
                }
                onPointerLeave={
                  props.onRowHover && (() => props.onRowHover?.(undefined))
                }
                onClick={
                  props.onRowClick &&
                  ((event) => {
                    if (event.currentTarget.contains(event.target as Node)) {
                      props.onRowClick?.(defaultData as T);
                    }
                  })
                }
              >
                <SmartCard
                  key={key}
                  className={classOverride(
                    rowIsSelected ? "bg-li selected" : "",
                    rowIsHovered ? "hovered" : "",
                  )}
                  style={
                    rowIsSelected ? props.selectedRowStyle
                    : rowIsHovered ?
                      props.hoveredRowStyle
                    : undefined
                  }
                  contentClassname={rowProps?.className}
                  contentStyle={rowProps?.style}
                  db={db}
                  sql={sql}
                  methods={methods}
                  tables={tables}
                  tableName={tableName}
                  defaultData={defaultData as T}
                  columns={columns}
                  hideColumns={props.hideColumns}
                  excludeNulls={excludeNulls}
                  popupFixedStyle={popupFixedStyle}
                  fieldConfigs={_fieldConfigs}
                  cardMode={props.cardMode ?? "summary"}
                  bordered={props.bordered}
                  flat={props.flat}
                  renderTitle={(value, row) =>
                    tableControls?.table ?
                      <CardItemTitle
                        table={tableControls.table}
                        tableHandler={db[tableControls.table.name] ?? {}}
                        columnConfig={undefined}
                        draggedRow={undefined}
                        row={row}
                        prgl={{ db, tables, methods, sql }}
                        showEdit={props.showEdit}
                        onClick={
                          props.onRowClick && (() => props.onRowClick?.(row))
                        }
                        renderDetails={(detailsProps) => (
                          <SmartCardList {...detailsProps} />
                        )}
                      >
                        {value}
                      </CardItemTitle>
                    : value
                  }
                  footer={getRowFooter}
                  getActions={getActions}
                  onClose={props.onClose}
                  smartFormProps={{ onSuccess }}
                  fullData={{
                    index,
                    rows: items as T[],
                  }}
                  showViewEditBtn={
                    "showEdit" in props ? props.showEdit : undefined
                  }
                />
              </div>
            );
          })
        }
      </MaybeFlipMove>
      <Pagination
        {...paginationState}
        totalRows={totalRows}
        className={fixedControls ? "f-0 flex-row-wrap" : undefined}
      />
      {footer}
    </ScrollFade>
  );
};

const MaybeFlipMove = ({
  children,
  flipMove,
  className,
  scrollable,
}: {
  children: React.ReactNode;
  flipMove: boolean;
  className?: string;
  scrollable?: boolean;
}) => {
  const content =
    flipMove ? <FlipMove className={className}>{children}</FlipMove> : children;
  return scrollable ?
      <ScrollFade
        className={classOverride(
          "SmartCardListRows o-auto f-1 min-h-0",
          className,
        )}
      >
        {content}
      </ScrollFade>
    : content;
};

const getCols = (cols: ValidatedColumnInfo[], row: AnyObject) => {
  const pKeyCols = cols.filter((c) => c.is_pkey);
  if (pKeyCols.every((c) => row[c.name])) {
    return pKeyCols;
  }
  return cols.filter((c) => {
    return (
      !c.is_nullable &&
      (c.tsDataType === "string" || c.tsDataType === "number") &&
      row[c.name] !== undefined
    );
  });
};

export const getKeyForRowData = (
  row: AnyObject,
  keyCols: ValidatedColumnInfo[],
) =>
  !keyCols.length ?
    JSON.stringify(row)
  : keyCols.map((c) => row[c.name]?.toString()).join("-");

export const useGetRowKeyCols = (
  cols: ValidatedColumnInfo[],
  row: AnyObject,
) => {
  return useMemo(() => {
    const keyCols = getCols(cols, row);
    return {
      keyCols,
    };
  }, [cols, row]);
};

export const useSmartCardListStyle = (style: React.CSSProperties) =>
  useMemo(
    () => ({
      /**
       * To ensure shadow is not clipped by parent
       */
      padding: "2px",
      margin: "-2px",
      flex: "0 1 auto", // Allow the body to grow with content, ensuring height is always not greater than content
      ...style,
    }),
    [style],
  );
