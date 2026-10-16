import { parsedJoinPathSchema } from "prostgles-types";
import { columnDisplayFormatSchema } from "../columnDisplayFormat.schema";

const FontStyle = {
  fontWeight: { enum: ["normal", "bold"], optional: true },
  buttonVariant: {
    enum: ["text", "faded", "filled", "outline"],
    optional: true,
  },
} as const;

const ChipStyle = {
  textColor: { type: "string", optional: true },
  chipColor: { type: "string", optional: true },
  cellColor: { type: "string", optional: true },
  borderColor: { type: "string", optional: true },
} as const;

const BasicConditionFilter = {
  type: {
    operator: {
      enum: ["contains", "=", ">", ">=", "<", "<=", "!=", "not null", "null"],
    },
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
    ...FontStyle,
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
    ...FontStyle,
    textColor: "string",
    minColor: "string",
    maxColor: "string",
  },
} as const;

const BarchartStyle = {
  type: {
    type: { enum: ["Barchart"] },
    ...FontStyle,
    barColor: "string",
    textColor: "string",
  },
} as const;

const sortSchema = {
  key: "string",
  asc: { type: "boolean", optional: true, nullable: true },
  nulls: { enum: ["first", "last"], optional: true, nullable: true },
  nullEmpty: { type: "boolean", optional: true },
} as const;

const dataTypes = [
  "string",
  "number",
  "boolean",
  "any",
  "string[]",
  "number[]",
  "boolean[]",
  "any[]",
] as const;

const columnFields = {
  idx: { type: "integer", optional: true },
  label: { type: "string", optional: true },
  show: { type: "boolean", optional: true },
  width: { type: "number", optional: true },
  format: { ...columnDisplayFormatSchema, optional: true },
  display: { enum: ["drillable-records"], optional: true },
  style: {
    optional: true,
    oneOf: [
      { type: { type: { enum: ["None"], optional: true }, ...FontStyle } },
      {
        type: {
          type: { enum: ["Icons"] },
          size: { type: "number", optional: true },
          valueToIconMap: { record: { values: "string" } },
          ...FontStyle,
        },
      },
      {
        type: {
          type: { enum: ["Fixed"] },
          ...FontStyle,
          ...ChipStyle,
        },
      },
      ConditionalStyle,
      ScaleStyle,
      BarchartStyle,
    ],
  },
  computedConfig: {
    optional: true,
    type: {
      isColumn: { type: "boolean", optional: true },
      column: { type: "string", optional: true },
      tsDataType: { enum: dataTypes },
      udt_name: "string",
      funcDef: {
        type: {
          key: "string",
          label: "string",
          subLabel: "string",
          isAggregate: { type: "boolean", optional: true },
          requiresArg: {
            enum: ["$duration", "$string_agg", "$template_string"],
            optional: true,
          },
          tsDataTypeCol: {
            oneOf: [{ enum: ["any"] }, { arrayOf: { enum: dataTypes } }],
            optional: true,
          },
          udtDataTypeCol: {
            oneOf: [{ enum: ["any"] }, "string[]"],
            optional: true,
          },
        },
      },
      args: {
        optional: true,
        type: {
          $duration: { type: { otherColumn: "string" }, optional: true },
          $string_agg: { type: { separator: "string" }, optional: true },
          $template_string: { type: "string", optional: true },
        },
      },
      aggregateOptions: {
        optional: true,
        type: {
          filter: { type: "any", optional: true },
          orderBy: { type: sortSchema, optional: true },
        },
      },
    },
  },
} as const;

/** The same configs used by table windows, keyed by column name in table options. */
export const tableColumnConfigFields = {
  ...columnFields,
  nested: {
    optional: true,
    type: {
      path: { arrayOf: parsedJoinPathSchema },
      columns: { arrayOfType: { name: "string", ...columnFields } },
      fallbackColumn: { type: "string", optional: true },
      joinType: { enum: ["inner", "left"], optional: true },
      limit: { type: "integer", optional: true },
      sort: { type: sortSchema, optional: true },
      detailedFilter: { type: "any[]", optional: true },
      detailedHaving: { type: "any[]", optional: true },
      display: {
        optional: true,
        oneOfType: [
          {
            type: { enum: ["values"] },
            labels: {
              enum: ["auto", "none", "inline", "above"],
              optional: true,
            },
          },
          { type: { enum: ["drillable-records"] } },
          {
            type: { enum: ["timechart"] },
            dateCol: "string",
            renderStyle: {
              enum: ["scatter plot", "line", "smooth", "bars", "smooth-line"],
            },
            yAxis: {
              oneOfType: [
                { isCountAll: { enum: [true] } },
                {
                  isCountAll: { enum: [false] },
                  colName: "string",
                  funcName: {
                    enum: [
                      "$countAll",
                      "$count",
                      "$min",
                      "$max",
                      "$sum",
                      "$avg",
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  },
} as const;
