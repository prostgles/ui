import type { TableOptions } from "../managedTableSchema";

const cardLabelSchema = {
  enum: ["above", "inline", "none"],
  optional: true,
} as const;

export const cardLayoutOptionsSchema = {
  type: {
    type: { enum: ["flex", "grid"], optional: true },
    columns: {
      type: "integer",
      optional: true,
      description: "Number of grid columns, starting at 1. Defaults to 2.",
    },
    labels: {
      ...cardLabelSchema,
      description: "Default field label display. Defaults to above.",
    },
    fields: {
      optional: true,
      description: "Card-only layout overrides, keyed by field name.",
      record: {
        partial: true,
        values: {
          type: {
            columnSpan: {
              type: "integer",
              optional: true,
              description:
                "Grid columns occupied by this field. Defaults to 1.",
            },
            row: {
              type: "integer",
              optional: true,
              description:
                "Starting grid row, numbered from 1. Omit for automatic placement.",
            },
            labels: cardLabelSchema,
          },
        },
      },
    },
  },
} as const;

export type CardLayoutOptions = NonNullable<
  NonNullable<TableOptions["card"]>["layout"]
>;
