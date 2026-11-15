import type { DBSSchema } from "@common/publishUtils";
import type { TableOptions } from "@common/managedTableSchema";

export const validateTableCardOptions = (
  tableOptions: DBSSchema["connections"]["table_options"] | undefined,
) => {
  for (const [tableName, options] of Object.entries(tableOptions ?? {})) {
    validateCardFields(options?.card, `table_options.${tableName}.card`);
  }
};

const validateCardFields = (card: TableOptions["card"], path: string) => {
  if (!card) return;
  const usedFields = new Set(
    [
      card.headerColumn,
      card.avatarColumn,
      ...(card.subHeaderColumns ?? [card.subHeaderColumn]),
    ].filter((name) => name !== undefined),
  );
  const addField = (name: string, fieldPath: string) => {
    if (!name.trim())
      throw new Error(`${fieldPath}: field name cannot be empty.`);
    if (usedFields.has(name)) {
      throw new Error(
        `${fieldPath}: field "${name}" is already used in this card.`,
      );
    }
    usedFields.add(name);
  };
  const summaryFields = card.summaryFields ?? [];
  if (summaryFields.length > 10) {
    throw new Error(`${path}.summaryFields: at most 10 fields are allowed.`);
  }
  summaryFields.forEach((name, index) =>
    addField(name, `${path}.summaryFields[${index}]`),
  );
  card.layoutSections?.forEach((section, sectionIndex) => {
    const sectionPath = `${path}.layoutSections[${sectionIndex}]`;
    if (
      section.layout !== undefined &&
      !["grid", "inline"].includes(section.layout)
    ) {
      throw new Error(`${sectionPath}.layout must be grid or inline.`);
    }
    const columnCount = section.columns ?? 2;
    if (!Number.isInteger(columnCount) || columnCount < 1 || columnCount > 4) {
      throw new Error(`${sectionPath}.columns must be between 1 and 4.`);
    }
    section.items.forEach((item, itemIndex) => {
      const itemPath = `${sectionPath}.items[${itemIndex}]`;
      addField(typeof item === "string" ? item : item.key, itemPath);
      if (typeof item === "string") return;
      const span = item.columnSpan ?? 1;
      if (!Number.isInteger(span) || span < 1 || span > columnCount) {
        throw new Error(
          `${itemPath}.columnSpan must be between 1 and ${columnCount}.`,
        );
      }
      if (
        item.labelPlacement &&
        !["above", "inline", "hidden"].includes(item.labelPlacement)
      ) {
        throw new Error(
          `${itemPath}.labelPlacement must be above, inline or hidden.`,
        );
      }
    });
  });
};
