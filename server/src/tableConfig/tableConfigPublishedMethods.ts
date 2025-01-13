import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";
import { DATA_TYPES, type JSONB } from "prostgles-types";

const primitiveJsonbType = {
  type: { enum: DATA_TYPES },
  optional: { type: "boolean", optional: true },
  nullable: { type: "boolean", optional: true },
  description: { type: "string", optional: true },
  title: { type: "string", optional: true },
  defaultValue: { type: "any", optional: true },
} as const satisfies JSONB.ObjectType["type"];

export const tableConfigPublishedMethods: TableConfig<{ en: 1 }> = {
  published_methods: {
    // dropIfExistsCascade: true,
    columns: {
      id: `SERIAL PRIMARY KEY`,
      name: `TEXT NOT NULL DEFAULT 'Method name'`,
      description: `TEXT NOT NULL DEFAULT 'Method description'`,
      connection_id: {
        sqlDefinition: `UUID REFERENCES connections(id) ON DELETE SET NULL`,
        info: { hint: "If null then connection was deleted" },
      },
      arguments: {
        nullable: false,
        defaultValue: "[]",
        jsonbSchema: {
          title: "Arguments",
          arrayOf: {
            oneOfType: [
              {
                name: { title: "Argument name", type: "string" },
                type: {
                  title: "Data type",
                  enum: [
                    "any",
                    "string",
                    "number",
                    "boolean",
                    "Date",
                    "time",
                    "timestamp",
                    "string[]",
                    "number[]",
                    "boolean[]",
                    "Date[]",
                    "time[]",
                    "timestamp[]",
                  ],
                },
                defaultValue: { type: "string", optional: true },
                optional: {
                  optional: true,
                  type: "boolean",
                  title: "Optional",
                },
                allowedValues: {
                  title: "Allowed values",
                  optional: true,
                  type: "string[]",
                },
              },
              {
                name: { title: "Argument name", type: "string" },
                type: { title: "Data type", enum: ["Lookup", "Lookup[]"] },
                defaultValue: { type: "any", optional: true },
                optional: { optional: true, type: "boolean" },
                lookup: {
                  title: "Table column",
                  lookup: {
                    type: "data-def",
                    column: "",
                    table: "",
                  },
                },
              },
              {
                name: { title: "Argument name", type: "string" },
                type: { title: "Data type", enum: ["JsonbSchema"] },
                defaultValue: { type: "any", optional: true },
                optional: { optional: true, type: "boolean" },
                schema: {
                  title: "Jsonb schema",
                  // record: {
                  //   values: { type: primitiveJsonbType },
                  // },
                  oneOfType: [
                    primitiveJsonbType,
                    {
                      ...primitiveJsonbType,
                      type: { enum: ["object", "object[]"] },
                      properties: {
                        record: {
                          values: {
                            type: primitiveJsonbType,
                          },
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
      run: "TEXT NOT NULL DEFAULT 'export const run: ProstglesMethod = async (args, { db, dbo, user }) => {\n  \n}'",
      outputTable: `TEXT`,
    },
    indexes: {
      unique_name: { unique: true, columns: "connection_id, name" },
    },
  },
};
