import React from "react";

import RTComp from "../RTComp";
import type {
  ValidatedColumnInfo,
  AnyObject,
  TableInfo,
  SubscriptionHandler,
  FilterItem,
} from "prostgles-types";
import { getKeys } from "prostgles-types";
import Loading from "../../components/Loading";
import type { FieldConfig } from "./SmartCard";
import SmartCard from "./SmartCard";
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import Btn from "../../components/Btn";
import { mdiDelete } from "@mdi/js";
import ErrorComponent from "../../components/ErrorComponent";
import SortByControl from "../SmartFilter/SortByControl";
import W_Table from "../W_Table/W_Table";
import { InsertButton } from "../SmartForm/InsertButton";
import type { PaginationProps } from "../../components/Table/Pagination";
import { Pagination } from "../../components/Table/Pagination";
import type { Prgl } from "../../App";
import { getSmartCardColumns } from "./getSmartCardColumns";
import type { SmartFormProps } from "../SmartForm/SmartForm";
import { classOverride, FlexCol } from "../../components/Flex";

export type SmartCardListProps<T extends AnyObject = AnyObject> = Pick<
  Prgl,
  "db" | "tables" | "methods" | "theme"
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
  getRowFooter?: (row: AnyObject | any) => React.ReactNode;
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

  showTopBar?: boolean | { insert?: boolean; sort?: boolean };
  rowProps?: {
    style?: React.CSSProperties;
    className?: string;
  };
  onSuccess?: SmartFormProps["onSuccess"];
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
      }
    | {
        data: AnyObject[];
        onChange?: (newData: AnyObject[]) => void;
      }
  );

type S = PaginationProps & {
  columns?: ValidatedColumnInfo[];
  variant?: SmartCardListProps["variant"];
  tableInfo?: TableInfo;
  items?: AnyObject[];
  error?: any;
  loading?: boolean;
  loaded?: boolean;
  dataAge: number;
  orderBy?: Record<string, boolean>;
};

const getSelectForFieldConfigs = (
  fcs?: FieldConfig<any>[],
  columns?: ValidatedColumnInfo[],
) => {
  if (!fcs) return "*";
  const result = fcs
    .filter((f) => {
      if (columns) {
        if (
          columns.some((c) =>
            typeof f === "string" ?
              c.name === f
            : f.select || f.name === c.name,
          )
        ) {
          return true;
        }
        console.warn("Bad/invalid column name provided: ", f);
        return false;
      }
      return true;
    })
    .reduce(
      (a, v) => ({
        ...a,
        [typeof v === "string" ? v : v.name]:
          typeof v === "string" || !v.select ? 1 : v.select,
      }),
      {},
    );

  const pKeyCols = columns?.filter((c) => c.is_pkey);
  if (pKeyCols?.length) {
    return {
      ...Object.fromEntries(pKeyCols.map(({ name }) => [name, 1])),
      ...result,
    };
  }

  return result;
};

export default class SmartCardList<T extends AnyObject> extends RTComp<
  SmartCardListProps<T>,
  S
> {
  state: S = {
    items: [],
    loading: true,
    dataAge: 0,
    page: 1,
    pageSize: 50,
    totalRows: 0,
  };

  dataSignature?: string;

  sub?: SubscriptionHandler;
  onDelta = async () => {
    const { tableName, db, columns } = this.props;
    let columns_ = columns ?? this.state.columns;
    if (!this.state.columns) {
      columns_ ??= await getSmartCardColumns(this.props);
      this.setState({ columns: columns_ });
    }

    if ("data" in this.props) {
      this.setState({ items: this.props.data });
    } else {
      const { fieldConfigs, throttle = 0 } = this.props;
      const filter = (this.props.filter ?? {}) as AnyObject;
      const orderBy = this.state.orderBy ?? this.props.orderBy;
      const select = getSelectForFieldConfigs(fieldConfigs, columns_);
      const dataSignature = W_Table.getTableDataRequestSignature(
        {
          filter,
          orderBy,
          limit: this.state.pageSize,
          offset: this.state.page ?? 1,
        },
        0,
        [throttle, tableName],
      );

      const setData = async () => {
        if ("data" in this.props) {
          this.setState({ items: this.props.data });
          return;
        }

        if (typeof tableName !== "string") {
          this.setState({ loading: true });
          try {
            if (!db.sql) throw "db.sql missing";
            const items = await db.sql(
              tableName.sqlQuery,
              tableName.args ?? {},
              { returnType: "rows" },
            );
            this.setState({
              items,
              loading: false,
              loaded: true,
              dataAge: Date.now(),
              totalRows: items.length,
            });
          } catch (error) {
            if (!this.mounted) return;
            this.setState({ error, loading: false });
          }
          return;
        }

        const tableHandler = db[tableName];
        const { fieldConfigs } = this.props;
        const filter = (this.props.filter ?? {}) as AnyObject;
        const orderBy = this.state.orderBy ?? this.props.orderBy;
        const select = getSelectForFieldConfigs(fieldConfigs, columns_);
        this.setState({ loading: true });
        try {
          if (!tableHandler?.find) throw new Error("tableHandler.find missing");

          const { page = 1, pageSize = this.props.limit ?? 25 } = this.state;
          let totalRows = -1;
          try {
            totalRows = (await tableHandler.count?.(filter)) ?? -1;
          } catch (error) {
            console.error(error);
          }

          const items = await tableHandler.find(filter, {
            limit: pageSize,
            orderBy,
            select,
            offset: (page - 1) * pageSize,
          });

          if (!this.mounted) return;
          this.setState({
            items,
            loading: false,
            loaded: true,
            dataAge: Date.now(),
            totalRows,
          });
          (this.props as any).onSetData?.(items);
        } catch (error: any) {
          if (!this.mounted) return;
          this.setState({ error, loading: false });
        }
      };

      if (dataSignature !== this.dataSignature) {
        this.dataSignature = dataSignature;
        if (typeof tableName !== "string") {
          setData();
        } else {
          const tableHandler = db[tableName];
          if (tableHandler?.find) {
            if (this.props.realtime) {
              await this.sub?.unsubscribe();
              if (!tableHandler.subscribe) {
                throw new Error("tableHandler.subscribe missing");
              }
              this.sub = await tableHandler.subscribe(
                filter,
                { limit: 0, select, throttle },
                () => {
                  setData();
                },
              );
            } else {
              setData();
            }
          }
        }
      }
    }
  };

  render() {
    const {
      tableName,
      db,
      methods,
      tables,
      className = "",
      style = {},
      theme,
      disableVariantToggle = true,
      popupFixedStyle,
      fieldConfigs: _fieldConfigs,
      getRowFooter,
      excludeNulls,
      footer,
      rowProps,
      noDataComponentMode,
      showTopBar = (this.state.items?.length ?? 0) > 30,
      title,
      noDataComponent,
      onSuccess,
    } = this.props;

    const { columns, loading, items, error, loaded } = this.state;

    if (error) return <ErrorComponent error={error} />;

    // const DEFAULT_VARIANT = "row-wrap"
    // const variant = this.state.variant || this.props.variant || DEFAULT_VARIANT;

    if (!columns || !items) return <Loading />;
    const { getKey } = getKeyCols(columns, items[0] ?? {});

    let content: React.ReactNode = items.map((defaultData, i) => {
      let deleteBtn: React.ReactNode = null;
      if ("onChange" in this.props) {
        deleteBtn = (
          <Btn
            iconPath={mdiDelete}
            color="danger"
            className="absolute"
            style={{ top: "5px", right: "5px" }}
            onClick={() => {
              if ("onChange" in this.props && this.props.onChange) {
                this.props.onChange(
                  this.props.data.filter((_, di) => di !== i),
                );
              }
            }}
          />
        );
      }
      return (
        <div
          key={getKey(defaultData)}
          className="relative"
          // className={`${rowProps?.className ?? ""} relative`}
          // style={rowProps?.style}
        >
          <SmartCard
            contentClassname={rowProps?.className}
            contentStyle={rowProps?.style}
            theme={theme}
            db={db as any}
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
              this.dataSignature = "z";
              this.forceUpdate();
            }}
            footer={getRowFooter}
            smartFormProps={{ onSuccess }}
            showViewEditBtn={
              "showEdit" in this.props ? this.props.showEdit : undefined
            }
          />
          {deleteBtn}
        </div>
      );
    });

    if (!loaded) {
      return null;
    }

    /** Used to prevent subsequent flickers during filter change if no items */
    if (noDataComponent && !items.length) {
      content = noDataComponent;
      if (noDataComponentMode === "hide-all") {
        return noDataComponent;
      }
    }

    const { sort, insert } =
      typeof showTopBar === "boolean" ?
        { sort: showTopBar, insert: showTopBar }
      : showTopBar;
    const orderBy =
      "data" in this.props ?
        undefined
      : (this.state.orderBy ?? this.props.orderBy);

    const showInsert =
      typeof tableName === "string" &&
      insert &&
      !("data" in this.props) &&
      this.props.tables
        .find((t) => t.name === this.props.tableName)
        ?.columns.some((c) => c.insert);

    const Header =
      title || showTopBar ?
        <div
          className="flex-row-wrap gap-p5 ai-end py-p25"
          style={{ justifyContent: "space-between" }}
        >
          {typeof title === "string" ?
            <h4 className="m-0">{title}</h4>
          : typeof title === "function" ?
            title({ count: this.state.totalRows ?? -1 })
          : title}

          {sort && (
            <>
              {!("data" in this.props) &&
                this.props.orderByfields?.length !== 0 && (
                  <SortByControl
                    btnProps={
                      this.props.btnColor === "gray" ?
                        { color: "default", variant: "faded" }
                      : {}
                    }
                    fields={this.props.orderByfields}
                    columns={columns}
                    value={
                      orderBy ?
                        {
                          key: getKeys(orderBy)[0]!,
                          asc: Object.values(orderBy)[0],
                        }
                      : undefined
                    }
                    onChange={(newSort) => {
                      this.setState({
                        orderBy:
                          !newSort ? {} : { [newSort.key]: !!newSort.asc },
                      });
                    }}
                  />
                )}

              {showInsert && (
                <InsertButton
                  theme={theme}
                  buttonProps={{}}
                  db={db}
                  tables={tables}
                  methods={methods}
                  tableName={tableName}
                  // onSuccess={showInsertUpdateDelete.onSuccess}
                />
              )}
            </>
          )}
        </div>
      : null;

    return (
      <FlexCol
        className={classOverride(
          "SmartCardList o-auto gap-p5 relative ",
          className,
        )}
        data-command="SmartCardList"
        style={{
          ...style,
          flex: "0 1 auto", // Allow the body to grow with content, ensuring height is always not greater than content
        }}
      >
        {loading && <Loading variant="cover" />}
        {Header}
        {content}
        <Pagination
          {...this.state}
          onPageChange={(page) => this.setState({ page })}
          onPageSizeChange={(pageSize) => this.setState({ pageSize })}
        />
        {footer}
      </FlexCol>
    );
  }
}

export const getKeyCols = (cols: ValidatedColumnInfo[], row: AnyObject) => {
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

  const keyCols = getCols(cols, row);
  if (!keyCols.length) {
    return {
      keyCols: undefined,
      getKey: (row: AnyObject) => JSON.stringify(row),
    };
  }
  return {
    keyCols,
    getKey: (row: AnyObject) => keyCols.map((c) => row[c.name]).join("-"),
  };
};
