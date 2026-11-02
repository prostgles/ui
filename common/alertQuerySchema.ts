import type { JSONB } from "prostgles-types";
import { groupedDetailedFilterSchema } from "./detailedFilterSchema";
import type { GroupedDetailedFilter } from "./filterUtils";

/** Sends when the query returns rows, available as rows alongside recipientId and localDate. */
export const alertQuerySchema = {
  type: {
    deduplicate: {
      optional: true,
      description:
        "Suppress previously sent query rows per recipient and channel. Omit to send every scheduled occurrence.",
      type: {
        key: {
          arrayOf: "string",
          description:
            "Selected scalar columns identifying an item, including computed query columns.",
        },
        for: {
          type: "string",
          description:
            "Time since successful delivery, e.g. 30m, 24h or 7d (s/m/h/d/w).",
        },
      },
    },
    query: {
      type: {
        table: "string",
        filter: groupedDetailedFilterSchema,
        select: "unknown",
        orderBy: { type: "unknown", optional: true },
        groupBy: { type: "boolean", optional: true },
        having: { ...groupedDetailedFilterSchema, optional: true },
        limit: { type: "integer", nullable: true, optional: true },
      },
    },
    template: {
      type: {
        title: "string",
        body: "string",
        data: {
          description: "Render each query row into a named template value.",
          record: {
            values: {
              type: {
                text: "string",
                separator: "string",
                nullText: { type: "string", optional: true },
              },
            },
          },
        },
      },
    },
  },
} as const satisfies JSONB.FieldType;

type StoredAlertQuery = JSONB.GetType<typeof alertQuerySchema>;

export type AlertQueryDefinition = Omit<StoredAlertQuery, "query"> & {
  query: Omit<StoredAlertQuery["query"], "filter" | "having"> & {
    filter: GroupedDetailedFilter;
    having?: GroupedDetailedFilter;
  };
};
