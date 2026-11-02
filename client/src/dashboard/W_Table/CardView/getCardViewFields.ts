import type { ColumnConfig } from "@common/ColumnConfig/ColumnConfig";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";
import { getTableCardColumns } from "../../SmartCard/getTableCardColumns";
import type { ProstglesTableColumn } from "../tableUtils/getTableCols";

export const getCardViewFields = (
  table: DBSchemaTableWJoins,
  columns: ProstglesTableColumn[],
  columnConfig: ColumnConfig[] | null | undefined,
) => {
  const configuredColumns = columnConfig ?? columns;
  const { subHeaderColumns, avatarColumn: configuredAvatarColumn } =
    getTableCardColumns(table, columns, 1, configuredColumns);
  const { headerColumn, avatarColumn } = getTableCardColumns(
    table,
    table.columns.map((column) => ({
      ...column,
      infoLevel:
        columnConfig?.find(({ name }) => name === column.name)?.infoLevel ??
        columns.find(({ name }) => name === column.name)?.infoLevel ??
        table.columnConfigs?.[column.name]?.infoLevel,
    })),
    1,
    configuredColumns,
  );
  const { bodyColumns } = getTableCardColumns(
    table,
    columns.filter((column) => column.show && !column.hidden),
    1,
    configuredColumns,
  );

  return {
    headerColumn,
    avatarColumn,
    avatarConfig:
      configuredAvatarColumn ??
      (avatarColumn && { ...avatarColumn, format: avatarColumn.renderAs }),
    subHeaderColumns,
    bodyColumns,
  };
};

export type CardViewFields = ReturnType<typeof getCardViewFields>;
