import { tableColumnConfigFields } from "../ColumnConfig/columnConfigSchema";
import { columnDisplayFormatSchema } from "../columnDisplayFormat.schema";
import { cardLayoutSectionsSchema } from "../ColumnConfig/cardLayout";

export const tableOptionsJsonbSchema = {
  record: {
    partial: true,
    values: {
      type: {
        icon: {
          type: "string",
          description:
            "MDI Icon name. For example: 'AccessPointNetwork', 'Github'",
          optional: true,
        },
        label: { type: "string", optional: true },
        referenceDisplay: {
          optional: true,
          description:
            "Default display for foreign keys referencing this table. Defaults to card.headerColumn when omitted. Explicit foreign-key column formats override it; empty columns disable it.",
          type: {
            columns: {
              description:
                "Fields to display, in order. Omitted formats inherit the target column's format and style.",
              arrayOfType: {
                name: "string",
                format: { ...columnDisplayFormatSchema, optional: true },
              },
            },
            display: {
              optional: true,
              description:
                "Defaults to drillable values without labels, grouped when every field supports drill-down.",
              oneOfType: [
                {
                  type: { enum: ["values"] },
                  labels: {
                    enum: ["auto", "none", "inline", "above"],
                    optional: true,
                  },
                },
                { type: { enum: ["drillable-records"] } },
              ],
            },
          },
        },
        sort: {
          optional: true,
          description: "Default sort order for new table views",
          arrayOfType: {
            key: "string",
            asc: "boolean",
            nulls: { enum: ["first", "last"], optional: true },
          },
        },
        rowIconColumn: {
          type: "string",
          description: `Column name that contains url to a local icon (in /icons folder) to be shown as an icon in each row. This is used in card and table views.`,
          optional: true,
        },
        columns: {
          optional: true,
          description:
            "Default column configs. Names absent from the table schema define custom columns.",
          record: {
            partial: true,
            values: {
              type: {
                icon: { type: "string", optional: true },
                renderAs: {
                  ...columnDisplayFormatSchema,
                  optional: true,
                },
                ...tableColumnConfigFields,
              },
            },
          },
        },
        card: {
          optional: true,
          description: "Card view options",
          type: {
            summaryFields: {
              type: "string[]",
              optional: true,
              description:
                "Ordered fields beside the title, subheaders and avatar. Also shown above detail sections. At most 10 fields; exclude header fields. An empty array explicitly selects no summary fields. When neither summaryFields nor layoutSections is configured, the first 10 fields (including headers) form the summary and the remaining fields appear in details. These lists do not change table column visibility.",
            },
            layoutSections: cardLayoutSectionsSchema,
            avatarColumn: {
              type: "string",
              description:
                "Column name that contains url to an image to be shown as an avatar in card view.",
              optional: true,
            },
            headerColumn: {
              optional: true,
              type: "string",
              description:
                "Column name that should be used as the header in card view.",
            },
            subHeaderColumn: {
              optional: true,
              type: "string",
              description:
                "Column name that should be used as the sub-header in card view.",
            },
            subHeaderColumns: {
              optional: true,
              type: "string[]",
              description:
                "Columns shown together in the card sub-header, in order. Overrides subHeaderColumn when provided.",
            },
          },
        },
      },
    },
  },
} as const;
