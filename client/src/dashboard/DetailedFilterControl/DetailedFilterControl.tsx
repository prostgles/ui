import type { DetailedFilter } from "@common/filterUtils";
import { isJoinedFilter } from "@common/filterUtils";
import { JoinedFilterControl } from "./JoinedFilterControl";
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
  onChange: (filter?: DetailedFilter, childFilterEnabled?: boolean) => void;
} & Pick<
  DetailedFilterBaseControlProps,
  | "db"
  | "variant"
  | "withShadow"
  | "contextData"
  | "selectedColumns"
  | "hideToggle"
  | "extraFilters"
  | "otherFilters"
>;
export const DetailedFilterControl = ({
  filterItem,
  table,
  tables,
  className,
  minimisedOverride,
  variant,
  withShadow,
  db,
  contextData,
  extraFilters,
  selectedColumns,
  hideToggle,
  onChange,
  otherFilters,
}: P) => {
  if (isJoinedFilter(filterItem)) {
    return (
      <JoinedFilterControl
        filter={filterItem}
        onChange={onChange}
        minimised={minimisedOverride}
        db={db}
        tables={tables}
        contextData={contextData}
        hideToggle={hideToggle}
        variant={variant}
        withShadow={withShadow}
        className={className}
      />
    );
  }
  const tableColumns = table.columns;
  const tableName = table.name;
  let filterColumn: FilterColumn | undefined;
  const { fieldName } = filterItem;
  let tableColumn = tableColumns.find((c) => c.name === fieldName);
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
  const filter = filterItem;
  return (
    <DetailedFilterBaseControl
      className={`${className} min-w-0 min-h-0`}
      label={selectedColumn?.label || filterColumn.label || fieldName}
      db={db}
      tableName={tableName}
      column={filterColumn}
      variant={variant}
      withShadow={withShadow}
      tables={tables}
      contextData={contextData}
      hideToggle={hideToggle}
      selectedColumns={selectedColumns}
      filter={{
        ...filter,
        minimised: minimisedOverride ?? filter.minimised,
      }}
      extraFilters={extraFilters}
      otherFilters={otherFilters}
      onChange={onChange}
      rootFilter={undefined}
    />
  );
};
