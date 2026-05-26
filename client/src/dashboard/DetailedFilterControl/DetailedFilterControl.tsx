import type { DetailedFilter, DetailedJoinedFilter } from "@common/filterUtils";
import { isDetailedFilter, isJoinedFilter } from "@common/filterUtils";
import { isObject } from "@common/publishUtils";
import type { ValidatedColumnInfo } from "prostgles-types";
import React from "react";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import {
  DetailedFilterBaseControl,
  type DetailedFilterBaseControlProps,
} from "./DetailedFilterBaseControl";
import {
  DEFAULT_VALIDATED_COLUMN_INFO,
  type FilterColumn,
} from "../SmartFilter/SmartFilter";

type P = {
  filterItem: DetailedFilter;
  table: DBSchemaTableWJoins;
  tables: DBSchemaTableWJoins[];
  minimisedOverride: boolean | undefined;
  className?: string;
} & Pick<
  DetailedFilterBaseControlProps,
  | "db"
  | "variant"
  | "contextData"
  | "selectedColumns"
  | "hideToggle"
  | "extraFilters"
  | "onChange"
  | "otherFilters"
>;
export const DetailedFilterControl = ({
  filterItem,
  table,
  tables,
  className,
  minimisedOverride,
  variant,
  db,
  contextData,
  extraFilters,
  selectedColumns,
  hideToggle,
  onChange,
  otherFilters,
}: P) => {
  const tableColumns = table.columns;
  const tableName = table.name;
  let filterColumn: FilterColumn | undefined;
  let fieldName: string | undefined;
  let label: string | undefined;
  let filterTableName = tableName;
  let tableColumn: ValidatedColumnInfo | undefined;
  if (isJoinedFilter(filterItem)) {
    ({ fieldName } = filterItem.filter);
    const lastPathItem = filterItem.path.at(-1);
    if (!lastPathItem) return <>Filter path lastPathItem missing</>;
    const lastTableName =
      isObject(lastPathItem) ? lastPathItem.table : lastPathItem;
    const nestedTableCol = tables
      .find((t) => t.name === lastTableName)
      ?.columns.find((c) => c.name === fieldName);
    tableColumn = nestedTableCol;
    filterTableName = lastTableName;
    label =
      filterItem.path.map((p) => (isObject(p) ? p.table : p)).join(" > ") +
      "." +
      fieldName;
  } else {
    ({ fieldName } = filterItem);
    tableColumn = tableColumns.find((c) => c.name === fieldName);
    const selectedColumn = selectedColumns?.find((c) => c.name === fieldName);
    const computedConfig = selectedColumn?.computedConfig;
    if (computedConfig) {
      filterColumn = {
        type: "computed",
        columns: selectedColumns ?? [],
        label: selectedColumn.name,
        name: selectedColumn.name,
        computedConfig,
        ...computedConfig,
      };
      tableColumn = undefined;
    }
    label = filterColumn?.name ?? fieldName;
  }

  if (tableColumn) {
    filterColumn = {
      type: "column",
      ...tableColumn,
    };
  }

  /**
   * Maybe add computed columns to dbo schema?!!
   */
  if (!filterColumn) {
    filterColumn = {
      type: "column",
      ...DEFAULT_VALIDATED_COLUMN_INFO,
      name: fieldName,
      label: fieldName,
    };
  }
  const filter = isJoinedFilter(filterItem) ? filterItem.filter : filterItem;
  return (
    <DetailedFilterBaseControl
      className={`${className} min-w-0 min-h-0`}
      label={label}
      db={db}
      tableName={filterTableName}
      column={filterColumn}
      variant={variant}
      tables={tables}
      contextData={contextData}
      hideToggle={hideToggle}
      selectedColumns={selectedColumns}
      filter={{
        ...filter,
        minimised: minimisedOverride ?? filter.minimised,
      }}
      extraFilters={extraFilters}
      otherFilters={
        isJoinedFilter(filterItem) ?
          otherFilters.filter(isDetailedFilter).map((filter) => {
            const res: DetailedJoinedFilter = {
              type: filterItem.type,
              path: [...filterItem.path.slice(0).reverse().slice(1), tableName],
              filter,
            };
            return res;
          })
        : otherFilters
      }
      onChange={(newFilterItem) => {
        if (newFilterItem && isJoinedFilter(filterItem)) {
          // Won't this case be handler by rootFilter.onChange??
          if (isJoinedFilter(newFilterItem)) {
            throw "Nested join filters not allowed";
          }
          newFilterItem = {
            ...filterItem,
            disabled: newFilterItem.disabled,
            minimised: newFilterItem.minimised,
            filter: { ...newFilterItem },
          };
        }
        onChange(newFilterItem);
      }}
      rootFilter={
        isJoinedFilter(filterItem) ? { value: filterItem, onChange } : undefined
      }
    />
  );
};
