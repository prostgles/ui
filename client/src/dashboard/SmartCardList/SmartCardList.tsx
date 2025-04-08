import React, { useMemo, useState } from "react";

import { mdiDelete } from "@mdi/js";
import { type DBHandlerClient } from "prostgles-client/dist/prostgles";
import type {
  AnyObject,
  FilterItem,
  ValidatedColumnInfo,
} from "prostgles-types";
import FlipMove from "react-flip-move";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import { classOverride, FlexCol } from "../../components/Flex";
import Loading from "../../components/Loading";
import { Pagination, usePagination } from "../../components/Table/Pagination";
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import type { FieldConfig } from "../SmartCard/SmartCard";
import SmartCard from "../SmartCard/SmartCard";
import type { SmartFormProps } from "../SmartForm/SmartForm";
import {
  SmartCardListHeaderControls,
  useSmartCardListControls,
} from "./SmartCardListHeaderControls";
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
  disableVariantToggle?: boolean;

  hideColumns?: string[];

  /**
   * Used in:
   * Changing how table columns are displayed
   * Displaying additional custom computed columns
   */
  fieldConfigs?: FieldConfig<T>[] | string[];

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
} & (
    | {
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
        orderBy?: Record<string, boolean>;
        realtime?: boolean;
        throttle?: number;
        orderByfields?: string[];
        showEdit?: boolean;
        onSetData?: (items: AnyObject[]) => void;
        data?: undefined;
        onChange?: undefined;
      }
    | {
        data: AnyObject[];
        onChange: (newData: AnyObject[]) => void;
        limit?: undefined;
        filter?: undefined;
        orderBy?: undefined;
        realtime?: undefined;
        throttle?: undefined;
        orderByfields?: undefined;
        showEdit?: undefined;
        onSetData?: undefined;
      }
  );

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
    onChange,
    onSetData,
    data,
    filter,
    throttle,
    realtime,
    columns: propsColumns,
  } = props;

  const paginationState = usePagination(
    "limit" in props && props.limit ? props.limit : 25,
  );

  const [stateOrderBy, setOrderBy] = useState<Record<string, boolean>>(
    "data" in props ? {} : (props.orderBy ?? {}),
  );
  const state = useSmartCardListState(
    {
      db,
      data,
      tableName,
      columns: propsColumns,
      fieldConfigs: _fieldConfigs as FieldConfig[],
      filter,
      throttle,
      limit: paginationState.limit,
      offset: paginationState.offset,
      realtime,
      orderBy: stateOrderBy,
      onSetData,
    },
    stateOrderBy,
  );
  const { columns, loading, items, error, loaded, totalRows } = state;
  const { keyCols } = useGetKeyCols(columns ?? [], items?.[0] ?? {});
  const controlsState = useSmartCardListControls({
    ...(props as SmartCardListProps),
    itemsLength: items?.length,
    totalRows,
    columns: columns ?? [],
    stateOrderBy,
    setOrderBy,
  });

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
        "SmartCardList o-auto gap-p5 relative ",
        className,
      )}
      data-command="SmartCardList"
      style={{
        ...style,
        /**
         * To ensure shadow is not clipped by parent
         */
        padding: "2px",
        margin: "-2px",
        flex: "0 1 auto", // Allow the body to grow with content, ensuring height is always not greater than content
      }}
    >
      {loading && <Loading variant="cover" />}

      {controlsState && (
        <SmartCardListHeaderControls
          {...(props as SmartCardListProps)}
          itemsLength={items.length}
          totalRows={totalRows}
          columns={columns}
          state={controlsState}
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
              <div key={getKey(defaultData, keyCols)} className="relative">
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
                {onChange && (
                  <Btn
                    iconPath={mdiDelete}
                    color="danger"
                    className="absolute"
                    style={{ top: "5px", right: "5px" }}
                    onClick={() => {
                      onChange(props.data.filter((_, di) => di !== i));
                    }}
                  />
                )}
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

const getKey = (row: AnyObject, keyCols: ValidatedColumnInfo[]) =>
  !keyCols.length ?
    JSON.stringify(row)
  : keyCols.map((c) => row[c.name]?.toString()).join("-");

const useGetKeyCols = (cols: ValidatedColumnInfo[], row: AnyObject) => {
  return useMemo(() => {
    const keyCols = getCols(cols, row);
    return {
      keyCols,
    };
  }, [cols, row]);
};
