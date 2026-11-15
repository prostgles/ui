import type { ColumnConfigWithInfo } from "@common/ColumnConfig/ColumnConfig";
import { isDefined } from "prostgles-types";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import { getColumnActions } from "../W_Table/ColumnMenu/ColumnDisplayFormat/getFormatColumnSelect";
import {
  hasCardFieldLists,
  type CardMode,
} from "@common/ColumnConfig/cardLayout";
import { getSectionedCardColumns } from "./getSectionedCardColumns";

export const getTableCardColumns = <
  Column extends Pick<
    ColumnConfigWithInfo,
    "name" | "show" | "idx" | "nested" | "defaultConfig" | "format" | "info"
  >,
>(
  table: Pick<DBSchemaTableWJoins, "card" | "columns">,
  columns: Column[],
  cardMode: CardMode = "summary",
) => {
  const { card } = table;
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
  const summaryColumns = orderedColumns.filter(
    (column, index) =>
      index + missingHeaderCount < 10 || !!getColumnActions(column),
  );
  const resolvedCard =
    card && hasCardFieldLists(card) ? card : (
      {
        summaryFields: summaryColumns
          .filter((column) => !headerColumns.includes(column))
          .map(({ name }) => name),
        layoutSections: [
          {
            items: orderedColumns
              .filter((column) => !summaryColumns.includes(column))
              .map(({ name }) => name),
          },
        ],
      }
    );
  return {
    avatarColumn,
    headerColumn,
    subHeaderColumns,
    headerColumns,
    ...getSectionedCardColumns({
      card: resolvedCard,
      columns: orderedColumns,
      headerColumns,
      resolveColumn,
      cardMode,
    }),
  };
};
