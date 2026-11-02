import type { ColumnConfigWithInfo } from "@common/ColumnConfig/ColumnConfig";
import { isDefined } from "prostgles-types";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import { getCardFieldLayout } from "./getCardLayoutStyle";

export const getTableCardColumns = <
  Column extends Pick<
    ColumnConfigWithInfo,
    "name" | "show" | "infoLevel" | "idx" | "nested" | "defaultConfig"
  >,
>(
  table: Pick<DBSchemaTableWJoins, "card" | "columnConfigs" | "columns">,
  columns: Column[],
  infoLevel: 1 | 2 = 1,
  columnConfig: Pick<ColumnConfigWithInfo, "infoLevel">[] = columns,
) => {
  const hasInfoLevels =
    columnConfig.some((column) => column.infoLevel) ||
    columns.some((column) => column.infoLevel) ||
    Object.values(table.columnConfigs ?? {}).some((column) => column.infoLevel);
  const { card } = table;
  const layout =
    infoLevel === 1 ? { ...card?.layout, type: "flex" as const } : card?.layout;
  const resolveColumn = (name: string | undefined) => {
    if (!name) return;
    return (
      columns.find(
        (column) =>
          column.show !== false &&
          (column.nested?.fallbackColumn ??
            column.defaultConfig?.nested?.fallbackColumn) === name,
      ) ?? columns.find((column) => column.name === name)
    );
  };
  const avatarColumn = resolveColumn(card?.avatarColumn);
  const headerColumn = resolveColumn(card?.headerColumn);
  const subHeaderNames =
    card?.subHeaderColumns ?? [card?.subHeaderColumn].filter(isDefined);
  const subHeaderColumns = subHeaderNames.map(resolveColumn).filter(isDefined);
  const headerColumns = Array.from(
    new Set(
      [avatarColumn, headerColumn, ...subHeaderColumns].filter(isDefined),
    ),
  );
  /* Card headers can still render when their table columns are hidden. */
  const missingHeaderCount = Array.from(
    new Set([card?.avatarColumn, card?.headerColumn, ...subHeaderNames]),
  ).filter(
    (name) =>
      name &&
      !resolveColumn(name) &&
      table.columns.some((column) => column.name === name),
  ).length;
  const orderedColumns = Array.from(
    new Set([
      ...headerColumns,
      ...columns
        .filter((column) => column.show !== false)
        .sort((a, b) => (a.idx ?? Infinity) - (b.idx ?? Infinity))
        .map(({ name }) => resolveColumn(name))
        .filter(isDefined),
    ]),
  );
  const visibleColumns = new Set(
    orderedColumns.filter((column, index) => {
      const level =
        hasInfoLevels ? column.infoLevel
        : index + missingHeaderCount < 10 ? 1
        : 2;
      return level && level <= infoLevel;
    }),
  );
  const isVisible = (column: Column | undefined): column is Column =>
    !!column && visibleColumns.has(column);
  const bodyColumns = orderedColumns
    .filter((column) => isVisible(column) && !headerColumns.includes(column))
    .map((column) => {
      const fallbackName =
        column.nested?.fallbackColumn ??
        column.defaultConfig?.nested?.fallbackColumn;
      return {
        column,
        ...getCardFieldLayout(
          layout,
          card?.layout?.fields?.[column.name] ??
            (fallbackName ? card?.layout?.fields?.[fallbackName] : undefined),
          false,
        ),
      };
    });

  return {
    avatarColumn: isVisible(avatarColumn) ? avatarColumn : undefined,
    headerColumn: isVisible(headerColumn) ? headerColumn : undefined,
    subHeaderColumns: subHeaderColumns.filter(isVisible),
    headerColumns: headerColumns.filter(isVisible),
    bodyColumns,
  };
};
