import React from "react";
import type { Prgl } from "../../../App";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";
import type { FieldConfig } from "../../SmartCard/SmartCard";
import { getTableCardColumns } from "../../SmartCard/getTableCardColumns";
import { RenderColumn } from "../../W_Table/RenderColumn/RenderColumn";
import { getColumnsWithInfo } from "../../W_Table/tableUtils/getColumnsWithInfo";
import { getTableSelect } from "../../W_Table/tableUtils/getTableSelect";
import type { ColumnConfig } from "@common/ColumnConfig/ColumnConfig";

export const getTableCardFieldConfigs = async ({
  table,
  tables,
  db,
  methods,
  columnConfig,
  infoLevel = 1,
}: Pick<Prgl, "tables" | "db" | "methods"> & {
  table: DBSchemaTableWJoins;
  columnConfig?: ColumnConfig[];
  infoLevel?: 1 | 2;
}): Promise<FieldConfig[]> => {
  const columns = getColumnsWithInfo(table.name, tables, columnConfig, {
    showAllColumns: infoLevel === 2,
  });
  const { avatarColumn, headerColumn, headerColumns, bodyColumns } =
    getTableCardColumns(table, columns, infoLevel);
  const displayedColumns = [
    ...headerColumns.map((column) => ({ column, hideLabel: true, style: {} })),
    ...bodyColumns,
  ];
  const { select } = await getTableSelect(
    {
      table_name: table.name,
      columns: columns.map((column) => ({
        ...column,
        show: displayedColumns.some(
          ({ column: displayed }) => displayed.name === column.name,
        ),
      })),
    },
    tables,
    db,
    {},
    true,
    methods,
  );
  return [
    ...displayedColumns.map(({ column: config, ...field }): FieldConfig => ({
      name: config.name,
      select: select[config.name],
      hideIf: infoLevel === 2 ? undefined : (value) => value == null,
      label: field.hideLabel ? "" : config.label,
      cardHeader:
        headerColumns.includes(config) ?
          {
            column: config,
            isAvatar: config === avatarColumn,
            isTitle: config === headerColumn,
          }
        : undefined,
      style: field.style,
      render: (value, row) => (
        <RenderColumn
          column={config}
          row={row}
          table={table}
          tables={tables}
          barchartVals={undefined}
          getValues={() => [value]}
        />
      ),
    })),
    ...Object.entries(select)
      .filter(
        ([name]) =>
          !displayedColumns.some(({ column }) => column.name === name),
      )
      .map(([name, select]) => ({ name, select, hide: true })),
  ];
};
