import React, { useMemo } from "react";

import type { DetailedFilter } from "@common/filterUtils";
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
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import type { FieldConfig, SmartCardProps } from "../SmartCard/SmartCard";
import { SmartCard } from "../SmartCard/SmartCard";
import type { InsertButtonProps } from "../SmartForm/InsertButton";
import type { SmartFormProps } from "../SmartForm/SmartForm";
import type { ColumnSort } from "../W_Table/ColumnMenu/ColumnMenu";
import { SmartCardListHeaderControls } from "./SmartCardListHeaderControls";
import { useSmartCardListState } from "./useSmartCardListState";

export type SmartCardListProps<T extends AnyObject = AnyObject> = Pick<
  Prgl,
  "db" | "tables" | "methods"
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

  hideColumns?: string[];

  /**
   * Used in:
   * Changing how table columns are displayed
   * Displaying additional custom computed columns
   */
  fieldConfigs?: FieldConfig<T>[];

  title?: React.ReactNode | ((args: { count: number }) => React.ReactNode);
  getRowFooter?: (row: T) => React.ReactNode | React.JSX.Element;
  footer?: React.ReactNode;

  /**
   * If true then will not displaye fields with null values
   * */
  excludeNulls?: boolean;

  tables: CommonWindowProps["tables"];
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
  rowProps?: {
    style?: React.CSSProperties;
    className?: string;
  };
  onSuccess?: SmartFormProps["onSuccess"];
  enableListAnimations?: boolean;
  getActions?: SmartCardProps<T>["getActions"];
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
  searchFilter?: DetailedFilter[];
  orderBy?: ColumnSort | ColumnSort[];
  realtime?: boolean;
  throttle?: number;
  orderByfields?: string[];
  showEdit?: boolean;
  onSetData?: (items: AnyObject[]) => void;
} & Pick<TestSelectors, "data-command">;

export const SmartCardList = <T extends AnyObject>(
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

  const smartCardListStyle = useSmartCardListStyle(style);

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
        "SmartCardList o-auto flex-col gap-p5 relative max-w-full",
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
        className="flex-col gap-p5 relative"
        flipMove={enableListAnimations}
      >
        {showNoDataComponent ?
          noDataComponent
        : items.map((defaultData, i) => {
            const key = getKeyForRowData(defaultData, keyCols);
            return (
              /** SmartCard wrapped in div to ensure MaybeFlipMove works */
              <div className="relative" key={key} data-key={key}>
                <SmartCard
                  key={key}
                  contentClassname={rowProps?.className}
                  contentStyle={rowProps?.style}
                  db={db}
                  methods={methods}
                  tables={tables}
                  tableName={tableName}
                  defaultData={defaultData as T}
                  columns={columns}
                  excludeNulls={excludeNulls}
                  popupFixedStyle={popupFixedStyle}
                  fieldConfigs={_fieldConfigs}
                  footer={getRowFooter}
                  getActions={getActions}
                  smartFormProps={{ onSuccess }}
                  showViewEditBtn={
                    "showEdit" in props ? props.showEdit : undefined
                  }
                />
              </div>
            );
          })
        }
      </MaybeFlipMove>
      <Pagination {...paginationState} totalRows={totalRows} />
      {footer}
    </ScrollFade>
  );
};

const MaybeFlipMove = ({
  children,
  flipMove,
  className,
}: {
  children: React.ReactNode;
  flipMove: boolean;
  className?: string;
}) => {
  if (flipMove) {
    return <FlipMove className={className}>{children}</FlipMove>;
  }
  return children;
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
      ...style,
      /**
       * To ensure shadow is not clipped by parent
       */
      padding: "2px",
      margin: "-2px",
      flex: "0 1 auto", // Allow the body to grow with content, ensuring height is always not greater than content
    }),
    [style],
  );
