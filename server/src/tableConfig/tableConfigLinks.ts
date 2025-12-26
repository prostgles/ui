import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";
import type { JSONB } from "prostgles-types";

const CommonLinkOpts = {
  colorArr: { type: "number[]", optional: true },
} as const;

const filter = {
  oneOfType: [{ $and: "any[]" }, { $or: "any[]" }],
  optional: true,
} as const;

const joinPath = {
  description:
    "When adding a chart this allows showing data from a table that joins to the current table",
  arrayOfType: {
    table: "string",
    on: { arrayOf: { record: { values: "any" } } },
  },
  optional: true,
} as const satisfies JSONB.FieldTypeObj;

const CommonChartLinkOpts = {
  dataSource: {
    optional: true,
    oneOfType: [
      {
        type: {
          enum: ["sql"],
          description:
            "Show data from an SQL query within an editor. Will not reflect latest changes to that query (must be re-added)",
        },
        sql: "string",
        withStatement: "string",
      },
      {
        type: {
          enum: ["table"],
          description:
            "Shows data from an opened table window. Any filters from that table will apply to the chart as well",
        },
        joinPath,
      },
      {
        type: {
          enum: ["local-table"],
          description:
            "Shows data from postgres table not connected to any window (w1_id === w2_id === current chart window). Custom filters can be added",
        },
        localTableName: {
          type: "string",
          description: "Local layer (w1_id === w2_id === current chart window)",
        },
        smartGroupFilter: filter,
      },
    ],
  },
  smartGroupFilter: filter,
  joinPath,
  localTableName: {
    type: "string",
    optional: true,
    description:
      "If provided then this is a local layer (w1_id === w2_id === current chart window)",
  },
  sql: {
    description: "Defined if chart links to SQL statement",
    optional: true,
    type: "string",
  },
  title: { type: "string", optional: true },
} as const satisfies JSONB.ObjectType["type"];

export const tableConfigLinks: TableConfig<{ en: 1 }> = {
  links: {
    columns: {
      id: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`,
      user_id: `UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE`,
      w1_id: `UUID NOT NULL REFERENCES windows(id)  ON DELETE CASCADE`,
      w2_id: `UUID NOT NULL REFERENCES windows(id)  ON DELETE CASCADE`,
      workspace_id: `UUID REFERENCES workspaces(id) ON DELETE SET NULL`,
      disabled: "boolean",
      options: {
        jsonbSchema: {
          oneOfType: [
            {
              type: { enum: ["table"] },
              ...CommonLinkOpts,
              tablePath: {
                ...joinPath,
                optional: false,
                description: "Table path from w1.table_name to w2.table_name",
              },
            },
            {
              type: { enum: ["map"] },
              ...CommonChartLinkOpts,
              osmLayerQuery: {
                type: "string",
                optional: true,
                description:
                  "If provided then this is a OSM layer (w1_id === w2_id === current chart window)",
              },
              mapIcons: {
                optional: true,
                oneOfType: [
                  {
                    type: { enum: ["fixed"] },
                    display: { enum: ["icon", "icon+circle"], optional: true },
                    iconPath: "string",
                  },
                  {
                    type: { enum: ["conditional"] },
                    display: { enum: ["icon", "icon+circle"], optional: true },
                    columnName: "string",
                    conditions: {
                      arrayOfType: {
                        value: "any",
                        iconPath: "string",
                      },
                    },
                  },
                ],
              },
              mapColorMode: {
                optional: true,
                oneOfType: [
                  {
                    type: { enum: ["fixed"] },
                    colorArr: "number[]",
                  },
                  {
                    type: { enum: ["scale"] },
                    columnName: "string",
                    min: "number",
                    max: "number",
                    minColorArr: "number[]",
                    maxColorArr: "number[]",
                  },
                  {
                    type: { enum: ["conditional"] },
                    columnName: "string",
                    conditions: {
                      arrayOfType: {
                        value: "any",
                        colorArr: "number[]",
                      },
                    },
                  },
                ],
              },
              mapShowText: {
                optional: true,
                type: {
                  columnName: { type: "string" },
                },
              },
              columns: {
                arrayOfType: {
                  name: {
                    type: "string",
                    description: "Geometry/Geography column",
                  },
                  colorArr: "number[]",
                },
              },
            },
            {
              type: { enum: ["timechart"] },
              ...CommonChartLinkOpts,
              groupByColumn: {
                type: "string",
                optional: true,
                description: "Used by timechart",
              },
              groupByColumnColors: {
                optional: true,
                arrayOfType: {
                  value: "any",
                  color: "string",
                },
              },
              otherColumns: {
                arrayOfType: {
                  name: "string",
                  label: { type: "string", optional: true },
                  udt_name: "string",
                  is_pkey: { type: "boolean", optional: true },
                },
                optional: true,
              },
              columns: {
                arrayOfType: {
                  name: { type: "string", description: "Date column" },
                  colorArr: "number[]",
                  statType: {
                    optional: true,
                    type: {
                      funcName: {
                        enum: [
                          "$min",
                          "$max",
                          "$countAll",
                          "$avg",
                          "$sum",
                          "$count",
                        ],
                      },
                      numericColumn: "string",
                    },
                  },
                },
              },
            },
            {
              type: { enum: ["barchart"] },
              ...CommonChartLinkOpts,
              statType: {
                optional: true,
                type: {
                  funcName: {
                    enum: [
                      "$min",
                      "$max",
                      "$count",
                      "$countAll",
                      "$avg",
                      "$sum",
                    ],
                  },
                  numericColumn: {
                    type: "string",
                    description:
                      "Numeric column. Required for all but $countAll",
                  },
                },
              },
              columns: {
                arrayOfType: {
                  name: {
                    type: "string",
                    description: "Label columns. Usually a text column",
                  },
                  colorArr: "number[]",
                },
              },
            },
          ],
        },
      },
      closed: `BOOLEAN DEFAULT FALSE`,
      deleted: `BOOLEAN DEFAULT FALSE`,
      created: `TIMESTAMPTZ DEFAULT NOW()`,
      last_updated: `BIGINT NOT NULL`,
    },
  },
};
