import React from "react";
import "./SmartSearch.css";

import type { DetailedFilter, TermSearchColumn } from "@common/filterUtils";
import ErrorComponent from "@components/ErrorComponent";
import type {
  SearchListItem,
  SearchListProps,
} from "@components/SearchList/SearchList";
import { SearchList } from "@components/SearchList/SearchList";
import type { AnyObject, ValidatedColumnInfo } from "prostgles-types";
import { isObject } from "prostgles-types";
import type { Prgl } from "src/App";
import type { DBSchemaTableWJoins } from "src/dashboard/Dashboard/dashboardUtils";
import RTComp from "../../RTComp";
import type { ColumnConfig } from "@common/ColumnConfig/ColumnConfig";
import { onSearchItems } from "./onSearchItems";
import {
  getSmartSearchColumns,
  type SmartSearchColumn,
} from "./getSmartSearchColumns";

export type SmartSearchOnChangeArgs = {
  filter: DetailedFilter[];
  /**
   * Full column value
   */
  columnValue?: string | number | Date | boolean | null;

  /**
   * Column term value as used in $term_highlight
   * (value converted to TEXT and if date then date part names are added)
   */
  columnTermValue?: string;
  term?: string;
  colName?: string;
};

type P = {
  id?: string;
  db: Prgl["db"];
  tableName: string;
  columns?: string[];
  /** Search shown configured columns and their configured joins. */
  columnConfigs?: ColumnConfig[];
  column?: string | ColumnConfig;
  selectedColumns?: ColumnConfig[];
  onChange?: (args?: SmartSearchOnChangeArgs) => void; //   source: "row" | "enter"
  defaultValue?: string;
  detailedFilter?: DetailedFilter[];
  className?: string;
  style?: React.CSSProperties;
  label?: string;
  placeholder?: string;
  onType?: (term: string) => any;
  /**
   * If true then will show results after clicking the empty input
   */
  searchEmpty?: boolean;

  /**
   * Defaults to $term_highlight which is equivalent to ILIKE %term%
   */
  searchOptions?: {
    type?: "$like" | "$ilike" | "=" | "$term_highlight";
    includeColumnNames?: boolean;
    hideMatchCase?: boolean;
  };

  onPressEnter?: (
    term: string,
    searchItems: SearchListItem[],
    searchColumns: TermSearchColumn[],
  ) => void;

  tables: DBSchemaTableWJoins[];

  searchOnFocus?: boolean;
  variant?: "search-no-shadow";
  noBorder?: boolean;
  extraFilters?: AnyObject[];

  size?: "small";

  hideCaseControl?: boolean;

  error?: any;

  inputStyle?: React.CSSProperties;
  noResultsComponent?: React.ReactNode;
};

type S = {
  searchKey?: number;
  searchItems?: SearchListProps["items"];
};

export class SmartSearch extends RTComp<P, S> {
  state: S = {
    searchKey: Date.now(),
  };

  onDelta = (dp) => {
    if (dp?.defaultValue) {
      this.setState({ searchKey: Date.now() });
    }
  };

  get filterableCols(): Pick<
    ValidatedColumnInfo,
    "name" | "label" | "tsDataType" | "udt_name" | "is_pkey"
  >[] {
    const { tableName, columns: cols, tables, column } = this.props;
    if (column && isObject(column) && column.computedConfig) {
      return [
        {
          name: column.name,
          label: column.label || column.name,
          tsDataType: column.computedConfig.tsDataType,
          udt_name: column.computedConfig.udt_name,
          is_pkey: false,
        },
      ];
    }
    const tbl = tables.find((t) => t.name === tableName);
    const columnName = this.column?.name;
    return getFilterableCols(tbl?.columns ?? []).filter(
      (c) =>
        columnName === "*" ||
        (columnName && c.name === columnName) ||
        (cols?.length && cols.includes(c.name)) ||
        (!cols && !columnName),
    );
  }

  searchItems: SearchListItem[] = [];
  onSearchItems = onSearchItems.bind(this);

  get searchColumns(): SmartSearchColumn[] {
    const { tableName, tables, columnConfigs } = this.props;
    if (columnConfigs) {
      return getSmartSearchColumns(tableName, tables, columnConfigs);
    }
    return this.filterableCols.map((info) => ({
      name: info.name,
      label: info.label || info.name,
      tableName,
      info,
    }));
  }

  get defaultValue() {
    const { defaultValue } = this.props;
    const col = this.column;
    if (col?.udt_name === "jsonb" && defaultValue && isObject(defaultValue)) {
      return JSON.stringify(defaultValue);
    }
    return defaultValue;
  }

  get column() {
    const { tables, tableName, column: colNameORColConfig } = this.props;
    const column =
      isObject(colNameORColConfig) ?
        colNameORColConfig.computedConfig ?
          colNameORColConfig.computedConfig.column
        : colNameORColConfig.name
      : colNameORColConfig;
    return tables
      .find((t) => t.name === tableName)
      ?.columns.find((c) => c.name === column);
  }

  render() {
    const { searchItems, searchKey = 1 } = this.state;
    const {
      style,
      className,
      label,
      placeholder = "Search ...",
      onPressEnter,
      variant,
      searchEmpty = false,
      detailedFilter,
      extraFilters,
      error,
      inputStyle,
      noResultsComponent,
      noBorder,
      columnConfigs,
    } = this.props;

    const { defaultValue } = this;

    if (!this.searchColumns.length) {
      return <div>No filterable columns</div>;
    }

    const rerenderProps = {
      key: (defaultValue ?? "") + searchKey,
      dataSignature: JSON.stringify([
        detailedFilter,
        extraFilters,
        columnConfigs,
      ]),
    };
    const searchNode = (
      <SearchList
        {...rerenderProps}
        label={label}
        defaultValue={defaultValue}
        style={style}
        inputID={this.props.id ?? "search-all"}
        inputProps={
          this.column?.tsDataType === "number" ? { type: "number" } : undefined
        }
        className={`SmartSearch ${className}`}
        items={searchItems}
        variant={variant ?? "search"}
        roundedItems={false}
        searchEmpty={searchEmpty}
        onSearchItems={this.onSearchItems}
        inputStyle={inputStyle}
        noBorder={noBorder}
        placeholder={placeholder}
        onPressEnter={
          !onPressEnter ? undefined : (
            (term) =>
              onPressEnter(
                term,
                this.searchItems,
                this.searchColumns.map(
                  ({ name, path, filter, expression }) => ({
                    name,
                    expression,
                    path,
                    filter,
                  }),
                ),
              )
          )
        }
        matchCase={
          this.props.searchOptions?.hideMatchCase ? { hide: true } : undefined
        }
        noResultsContent={noResultsComponent}
      />
    );

    if (error) {
      return (
        <div className={"flex-col gap-p25 " + (className || "")} style={style}>
          {searchNode}
          <ErrorComponent error={error} />
        </div>
      );
    }

    return searchNode;
  }
}

export const getFilterableCols = (cols: ValidatedColumnInfo[]) => {
  return cols.filter(
    (c) =>
      c.filter &&
      c.select &&
      // c.udt_name !== "geography" &&
      // c.udt_name !== "geometry" &&
      c.udt_name !== "bytea",
  );
};
