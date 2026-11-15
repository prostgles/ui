import type {
  ColumnConfig,
  ColumnConfigWithInfo,
} from "@common/ColumnConfig/ColumnConfig";
import type { TermSearchColumn } from "@common/filterUtils";
import type { ValidatedColumnInfo } from "prostgles-types";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";
import { getJSONDiffComputedConfig } from "../../W_Table/ColumnMenu/ColumnDisplayFormat/getFormatColumnSelect";
import { getComputedColumnSelect } from "../../W_Table/tableUtils/getComputedColumnSelect";
import { getColumnsWithInfo } from "../../W_Table/tableUtils/getColumnsWithInfo";

export type SmartSearchColumn = TermSearchColumn & {
  tableName: string;
  label: string;
  info: Pick<
    ValidatedColumnInfo,
    "name" | "tsDataType" | "udt_name" | "is_pkey"
  >;
};

export const getSmartSearchColumns = (
  tableName: string,
  tables: DBSchemaTableWJoins[],
  columnConfigs: ColumnConfig[],
): SmartSearchColumn[] => {
  if (!columnConfigs.length) return [];
  return getColumnsWithInfo(tableName, tables, columnConfigs).flatMap(
    (column): SmartSearchColumn[] => {
      if (!column.show || column.computedConfig) return [];
      const { nested } = column;
      if (nested) {
        const target = nested.path.at(-1);
        if (
          !target ||
          nested.columns.some(
            (child) => child.show && child.computedConfig?.funcDef.isAggregate,
          )
        )
          return [];
        return nested.columns.flatMap((child) => {
          const searchColumn = getSearchColumn(child, target.table, tables);
          if (!searchColumn) return [];
          return [
            {
              ...searchColumn,
              label: `${column.label || column.name}.${searchColumn.label}`,
              path: nested.path,
              filter: nested.detailedFilter,
            },
          ];
        });
      }
      const searchColumn = getSearchColumn(column, tableName, tables);
      return searchColumn ? [searchColumn] : [];
    },
  );
};

const getSearchColumn = (
  column: ColumnConfigWithInfo,
  tableName: string,
  tables: DBSchemaTableWJoins[],
): SmartSearchColumn | undefined => {
  const table = tables.find((table) => table.name === tableName);
  if (
    !table ||
    !column.show ||
    column.computedConfig ||
    !column.info?.filter ||
    column.udt_name === "bytea"
  ) {
    return;
  }
  const computedConfig = getJSONDiffComputedConfig(column, table);
  const snapshotColumns = computedConfig?.args?.$jsonb_diff;
  if (
    snapshotColumns &&
    !Object.values(snapshotColumns).every((name) =>
      table.columns.some((column) => column.name === name && column.filter),
    )
  ) {
    return;
  }
  return {
    name: column.name,
    label: column.label || column.info.label || column.name,
    tableName,
    info: column.info,
    expression: computedConfig && getComputedColumnSelect(computedConfig),
  };
};
