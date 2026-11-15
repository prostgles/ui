import type { CardMode } from "@common/ColumnConfig/cardLayout";
import React from "react";
import type { Prgl } from "../../../App";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";
import type { FieldConfig } from "../../SmartCard/SmartCard";
import { getTableCardColumns } from "../../SmartCard/getTableCardColumns";
import { RenderColumn } from "../../W_Table/RenderColumn/RenderColumn";
import { getColumnsWithInfo } from "../../W_Table/tableUtils/getColumnsWithInfo";
import { getTableSelect } from "../../W_Table/tableUtils/getTableSelect";
import type { ColumnConfig } from "@common/ColumnConfig/ColumnConfig";
import { hasCardFieldLists } from "@common/ColumnConfig/cardLayout";
import { isEmptyColumnValue } from "../../W_Table/ColumnMenu/ColumnDisplayFormat/isEmptyColumnValue";

export const getTableCardFieldConfigs = async ({
  table,
  tables,
  db,
  methods,
  columnConfig,
  cardMode = "summary",
  hideColumns,
}: Pick<Prgl, "tables" | "db" | "methods"> & {
  table: DBSchemaTableWJoins;
  columnConfig?: ColumnConfig[];
  cardMode?: CardMode;
  hideColumns?: string[];
}): Promise<FieldConfig[]> => {
  const columns = getColumnsWithInfo(table.name, tables, columnConfig, {
    showAllColumns: cardMode !== "summary" || hasCardFieldLists(table.card),
  });
  const visibleColumns = columns.filter(
    (column) =>
      !hideColumns?.some(
        (name) =>
          name === column.name ||
          name === column.nested?.fallbackColumn ||
          name === column.defaultConfig?.nested?.fallbackColumn,
      ),
  );
  const { avatarColumn, headerColumn, headerColumns, bodyColumns } =
    getTableCardColumns(table, visibleColumns, cardMode);
  const displayedColumns = [
    ...headerColumns.map((column) => ({
      column,
      hideLabel: true,
      style: {},
      cardSection: undefined,
    })),
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
      columnConfig: config,
      select: select[config.name],
      hideIf:
        cardMode === "summary" ?
          (_value, row) => isEmptyColumnValue(config, row)
        : undefined,
      label: field.hideLabel ? "" : config.label,
      cardSection: field.cardSection,
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
          maxCellChars={config === headerColumn ? Infinity : undefined}
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
