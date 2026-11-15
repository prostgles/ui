import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";
import { getTableCardColumns } from "../../SmartCard/getTableCardColumns";
import type { ProstglesTableColumn } from "../tableUtils/getTableCols";

export const getCardViewFields = (
  table: DBSchemaTableWJoins,
  columns: ProstglesTableColumn[],
) => {
  const { subHeaderColumns, avatarColumn: configuredAvatarColumn } =
    getTableCardColumns(table, columns);
  const { headerColumn, avatarColumn } = getTableCardColumns(
    table,
    table.columns,
  );
  const { bodyColumns } = getTableCardColumns(
    table,
    columns.filter((column) => column.show && !column.hidden),
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
