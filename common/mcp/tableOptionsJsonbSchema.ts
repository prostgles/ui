import { columnDisplayFormatSchema } from "../columnDisplayFormat.schema";

const ChipStyle = {
  textColor: { type: "string", optional: true },
  chipColor: { type: "string", optional: true },
  cellColor: { type: "string", optional: true },
  borderColor: { type: "string", optional: true },
} as const;

const BasicConditionFilter = {
  type: {
    operator: { enum: ["contains", "=", ">", ">=", "<", "<=", "!="] },
    condition: "any",
    ...ChipStyle,
  },
} as const;

const InConditionFilter = {
  type: {
    operator: { enum: ["in", "not in"] },
    condition: "any[]",
    ...ChipStyle,
  },
} as const;

const ConditionFilter = {
  oneOf: [BasicConditionFilter, InConditionFilter],
} as const;

const ConditionalStyle = {
  type: {
    type: { enum: ["Conditional"] },
    column: { type: "string", optional: true },
    conditions: {
      arrayOf: ConditionFilter,
    },
    defaultStyle: {
      optional: true,
      type: ChipStyle,
    },
  },
} as const;

const ScaleStyle = {
  type: {
    type: { enum: ["Scale"] },
    textColor: "string",
    minColor: "string",
    maxColor: "string",
  },
} as const;

const BarchartStyle = {
  type: {
    type: { enum: ["Barchart"] },
    barColor: "string",
    textColor: "string",
  },
} as const;

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
          record: {
            partial: true,
            values: {
              type: {
                icon: { type: "string", optional: true },
                renderAs: {
                  ...columnDisplayFormatSchema,
                  optional: true,
                },
                style: {
                  optional: true,
                  oneOf: [ConditionalStyle, ScaleStyle, BarchartStyle],
                },
              },
            },
          },
        },
        card: {
          optional: true,
          description: "Card view options",
          type: {
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
            visibleColumns: {
              optional: true,
              description:
                "Array of column names that should be visible in card view by default",
              arrayOf: {
                oneOf: [
                  "string",
                  {
                    type: {
                      column: "string",
                      hideLabel: { type: "boolean", optional: true },
                      // maxHeightPx: { type: "integer", optional: true },
                      // widthPerc: { type: "integer", optional: true },
                      // gridColumn: { optional: true, type: "string" },
                      // gridRow: { optional: true, type: "string" },
                    },
                  },
                ],
              },
            },
          },
          // layout: {
          //   optional: true,
          //   type: {
          //     type: { enum: ["CardLayout"] },
          //     // Recursive type, so we need to use `any` here
          //     children: "any",
          //   },
          // },
        },
      },
    },
  },
} as const;
