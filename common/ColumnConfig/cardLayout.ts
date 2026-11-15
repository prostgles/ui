import type { TableOptions } from "../managedTableSchema";

export const cardLayoutSectionsSchema = {
  optional: true,
  description:
    "Ordered detail sections below the summary. Fields not used by the header, summary or sections appear under Show additional fields. Array order controls field placement; do not repeat fields. An empty array explicitly selects no detail fields.",
  arrayOfType: {
    header: { type: "string", optional: true },
    layout: {
      enum: ["grid", "inline"],
      optional: true,
      description:
        "Defaults to grid. Inline sizes fields to their content and wraps them onto new lines as needed.",
    },
    columns: {
      enum: [1, 2, 3, 4],
      optional: true,
      description:
        "Grid only. Defaults to 2. Grid sections collapse to one column when narrow.",
    },
    items: {
      arrayOf: {
        oneOf: [
          "string",
          {
            type: {
              key: "string",
              labelPlacement: {
                enum: ["hidden", "above", "inline"],
                optional: true,
                description: "Defaults to above.",
              },
              columnSpan: {
                enum: [1, 2, 3, 4],
                optional: true,
                description:
                  "Grid only. Defaults to 1. Must not exceed section columns.",
              },
            },
          },
        ],
      },
    },
  },
} as const;

export const hasCardFieldLists = (card: TableOptions["card"]) =>
  !!(card?.summaryFields || card?.layoutSections);

export type CardLayoutSection = NonNullable<
  NonNullable<TableOptions["card"]>["layoutSections"]
>[number];

export type CardMode = "summary" | "details" | "expanded";
