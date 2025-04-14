import React, { useMemo } from "react";

import { type DBHandlerClient } from "prostgles-client/dist/prostgles";
import type {
  AnyObject,
  FilterItem,
  ValidatedColumnInfo,
} from "prostgles-types";
import FlipMove from "react-flip-move";
import type { Prgl } from "../../App";
import ErrorComponent from "../../components/ErrorComponent";
import { classOverride, FlexCol } from "../../components/Flex";
import Loading from "../../components/Loading";
import { Pagination, usePagination } from "../../components/Table/Pagination";
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import type { FieldConfig } from "../SmartCard/SmartCard";
import { SmartCard } from "../SmartCard/SmartCard";
import type { SmartFormProps } from "../SmartForm/SmartForm";
import type { ColumnSort } from "../W_Table/ColumnMenu/ColumnMenu";
import { SmartCardListHeaderControls } from "./SmartCardListHeaderControls";
import { useSmartCardListState } from "./useSmartCardListState";
import type { SmartGroupFilter } from "../../../../commonTypes/filterUtils";

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
  disableVariantToggle?: boolean;

  hideColumns?: string[];

  /**
   * Used in:
   * Changing how table columns are displayed
   * Displaying additional custom computed columns
   */
  fieldConfigs?: FieldConfig<T>[];

  title?: React.ReactNode | ((args: { count: number }) => React.ReactNode);
  getRowFooter?: (row: AnyObject | any) => React.ReactNode | React.JSX.Element;
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

  showTopBar?: boolean | { insert?: true; sort?: true };
  rowProps?: {
    style?: React.CSSProperties;
    className?: string;
  };
  onSuccess?: SmartFormProps["onSuccess"];
  enableListAnimations?: boolean;
  onClickRow?: (row: AnyObject) => void;
  /**
   * Show top N records
   * Defaults to 20
   */
  limit?: number;
  filter?:
    | AnyObject
    | FilterItem<T & AnyObject>
    | { $and: FilterItem<T & AnyObject>[] }
    | { $or: FilterItem<T & AnyObject>[] };
  searchFilter?: SmartGroupFilter;
  orderBy?: ColumnSort | ColumnSort[];
  realtime?: boolean;
  throttle?: number;
  orderByfields?: string[];
  showEdit?: boolean;
  onSetData?: (items: AnyObject[]) => void;
};

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
    disableVariantToggle = true,
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
    onClickRow,
    limit = 25,
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
    <FlexCol
      className={classOverride(
        "SmartCardList o-auto gap-p5 relative max-w-full",
        className,
      )}
      data-command="SmartCardList"
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
            return (
              <div
                key={getKeyForRowData(defaultData, keyCols)}
                className={`relative ${onClickRow ? "pointer" : ""}`}
                onClick={
                  onClickRow &&
                  ((e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const clickedANestedPopup = !e.currentTarget.contains(
                      e.target as Node,
                    );
                    if (clickedANestedPopup) return;
                    onClickRow(defaultData);
                  })
                }
              >
                <SmartCard
                  contentClassname={rowProps?.className}
                  contentStyle={rowProps?.style}
                  db={db as DBHandlerClient}
                  methods={methods}
                  tables={tables}
                  tableName={tableName}
                  defaultData={defaultData}
                  columns={columns}
                  disableVariantToggle={disableVariantToggle}
                  excludeNulls={excludeNulls}
                  popupFixedStyle={popupFixedStyle}
                  fieldConfigs={_fieldConfigs}
                  onChanged={() => {
                    // this.dataSignature = "z";
                    // this.forceUpdate();
                  }}
                  footer={getRowFooter}
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
    </FlexCol>
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
