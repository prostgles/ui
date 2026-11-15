import type { ColumnConfigWithInfo } from "@common/ColumnConfig/ColumnConfig";
import type { TableOptions } from "@common/managedTableSchema";
import type { CSSProperties } from "react";
import type { CardMode } from "@common/ColumnConfig/cardLayout";

export type CardFieldSection = {
  index: number;
  header: string | undefined;
  columns: number;
  layout: "grid" | "inline";
};

export const getSectionedCardColumns = <
  Column extends Pick<ColumnConfigWithInfo, "name">,
>({
  card,
  columns,
  headerColumns,
  resolveColumn,
  cardMode,
}: {
  card: NonNullable<TableOptions["card"]>;
  columns: Column[];
  headerColumns: Column[];
  resolveColumn: (name: string | undefined) => Column | undefined;
  cardMode: CardMode;
}) => {
  const usedColumns = new Set(headerColumns);
  const bodyColumns: {
    column: Column;
    hideLabel: boolean;
    style: CSSProperties;
    cardSection: CardFieldSection | undefined;
  }[] = [];
  const addColumn = (
    name: string,
    visible: boolean,
    cardSection: CardFieldSection | undefined,
    labelPlacement: "hidden" | "above" | "inline" = "above",
    columnSpan = 1,
  ) => {
    const column = resolveColumn(name);
    if (!column || usedColumns.has(column)) return;
    usedColumns.add(column);
    if (!visible) return;
    const fieldStyle: CSSProperties & { "--card-field-span": number } = {
      ...(labelPlacement === "inline" && {
        flexDirection: "row",
        alignItems: "baseline",
        gap: ".5em",
      }),
      ...(cardSection && { minWidth: 0 }),
      maxWidth: "100%",
      "--card-field-span": columnSpan,
    };
    bodyColumns.push({
      column,
      hideLabel: labelPlacement === "hidden",
      style: fieldStyle,
      cardSection,
    });
  };
  card.summaryFields?.forEach((name) => addColumn(name, true, undefined));
  card.layoutSections?.forEach((section, index) => {
    const cardSection: CardFieldSection = {
      index,
      header: section.header,
      columns: section.columns ?? 2,
      layout: section.layout ?? "grid",
    };
    section.items.forEach((item) => {
      if (typeof item === "string") {
        addColumn(item, cardMode !== "summary", cardSection);
      } else {
        addColumn(
          item.key,
          cardMode !== "summary",
          cardSection,
          item.labelPlacement,
          item.columnSpan,
        );
      }
    });
  });
  const additionalColumns = columns.filter(
    (column) => !usedColumns.has(column),
  );
  const additionalSection: CardFieldSection = {
    index: card.layoutSections?.length ?? 0,
    header: "Additional fields",
    columns: 2,
    layout: "grid",
  };
  additionalColumns.forEach(({ name }) =>
    addColumn(name, cardMode === "expanded", additionalSection),
  );
  return { bodyColumns, hasAdditionalFields: !!additionalColumns.length };
};
