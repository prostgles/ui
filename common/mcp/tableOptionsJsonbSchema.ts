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
        icon: { type: "string", optional: true },
        label: { type: "string", optional: true },
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
          type: {
            headerColumn: { type: "string", optional: true },
          },
        },
      },
    },
  },
} as const;
