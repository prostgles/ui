import { fixIndent } from "./utils";
export const userInputSchema = {
    optional: true,
    description: fixIndent(`
    Prefer to use the most ergonomic types ("table-column-value", "table-column-values", "enum", ...etc) over "custom" to restrict the input and make it easier for the user to choose the correct value.
  `),
    record: {
        values: {
            oneOfType: [
                {
                    title: "string",
                    optional: { type: "boolean", optional: true },
                    type: { enum: ["table-column-value"] },
                    tableName: "string",
                    columnName: "string",
                    defaultValue: { type: "any", optional: true },
                },
                {
                    title: "string",
                    optional: { type: "boolean", optional: true },
                    type: { enum: ["table-column-values"] },
                    tableName: "string",
                    columnName: "string",
                    defaultValue: { type: "any[]", optional: true },
                },
                {
                    title: "string",
                    optional: { type: "boolean", optional: true },
                    type: { enum: ["table-filter"] },
                    tableName: "string",
                    defaultValue: { record: { values: "any" }, optional: true },
                },
                {
                    title: "string",
                    optional: { type: "boolean", optional: true },
                    type: { enum: ["table-column"] },
                    tableName: "string",
                    defaultValue: { type: "string", optional: true },
                },
                {
                    title: "string",
                    optional: { type: "boolean", optional: true },
                    type: { enum: ["table-name"] },
                    defaultValue: { type: "string", optional: true },
                },
                {
                    title: "string",
                    optional: { type: "boolean", optional: true },
                    type: { enum: ["table-and-column"] },
                    defaultValue: {
                        type: { tableName: "string", columnName: "string" },
                        optional: true,
                    },
                },
                {
                    title: "string",
                    optional: { type: "boolean", optional: true },
                    type: { enum: ["enum"] },
                    values: "string[]",
                    defaultValue: { type: "string", optional: true },
                },
                {
                    title: "string",
                    optional: { type: "boolean", optional: true },
                    type: { enum: ["custom"] },
                    dataType: { enum: ["string", "number", "boolean", "Date"] },
                    defaultValue: { type: "unknown", optional: true },
                },
                {
                    title: "string",
                    optional: { type: "boolean", optional: true },
                    type: { enum: ["folder-path", "file-path"] },
                    accessMode: { enum: ["read", "read-write"] },
                },
            ],
        },
    },
};
