var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { runCodeInSandboxSchema } from "./runCodeInSandboxSchema";
import { agentDefinitionsSchema, } from "./startAgenticWorkflowSchema";
import { fixIndent } from "../utils";
const runSQLSchema = {
    type: {
        sql: {
            type: "string",
            description: "SQL query to execute",
        },
        query_timeout: {
            type: "number",
            optional: true,
            description: "Maximum time in milliseconds the query will be allowed to run. Defaults to 30000.",
        },
        query_params: {
            optional: true,
            description: "Query parameters to use in the SQL query. Must satisfy the query schema. Supports index based ($1, $2, etc.) and named parameters (${paramName}).",
            oneOf: ["any[]", { record: { values: "any" } }],
        },
    },
};
const filterSchema = {
    filter: {
        description: "Row filter. Must satisfy the table schema. Example filters: { $or: [{ id: 1 }, { name: { $in: ['John'] } }] }",
        record: { values: "any" },
    },
};
const selectSchema = {
    optional: true,
    oneOf: [
        { enum: ["*"] },
        {
            description: "Fields to select. Must satisfy the table schema. Example: { id: 1, name: 1 } or { password: 0 }",
            record: { values: { enum: [1, 0] } },
        },
    ],
};
const outputSchemaArrayOfObjects = {
    arrayOf: {
        record: {
            values: "any",
        },
    },
};
const _a = agentDefinitionsSchema.record.values.type, { outputSchema } = _a, agentSchemaWithoutOutput = __rest(_a, ["outputSchema"]);
const _b = runCodeInSandboxSchema.type, { files, userInput, userInputValue } = _b, runTsSchema = __rest(_b, ["files", "userInput", "userInputValue"]);
export const dbMcpSchema = {
    execute_readonly_sql: {
        annotations: { readOnlyHint: true },
        description: "Executes a SQL query on the connected database in readonly mode (no data can be changed, the transaction is rolled back at the end).",
        schema: runSQLSchema,
        outputSchema: outputSchemaArrayOfObjects,
    },
    execute_sql: {
        annotations: { readOnlyHint: false, destructiveHint: true },
        description: "Executes a SQL query on the connected database in commit mode (data can be changed, the transaction committed at the end).",
        schema: runSQLSchema,
        outputSchema: outputSchemaArrayOfObjects,
    },
    count: {
        description: "Counts rows in a table that satisfy a filter.",
        annotations: { readOnlyHint: true },
        schema: {
            type: {
                tableName: "string",
                filter: Object.assign(Object.assign({}, filterSchema.filter), { optional: true }),
            },
        },
        outputSchema: "number",
    },
    find: {
        description: "Selects rows from a table.",
        annotations: { readOnlyHint: true },
        schema: {
            type: {
                tableName: "string",
                filter: Object.assign({ optional: true }, filterSchema.filter),
                select: selectSchema,
                orderBy: {
                    optional: true,
                    arrayOfType: {
                        key: "string",
                        asc: { enum: [true, false] },
                        nulls: { enum: ["first", "last"], optional: true },
                    },
                },
                limit: { optional: true, type: "integer" },
                offset: { optional: true, type: "integer" },
            },
        },
        outputSchema: outputSchemaArrayOfObjects,
    },
    insert: {
        description: "Inserts a row into a table.",
        annotations: { readOnlyHint: false },
        schema: {
            type: {
                tableName: "string",
                data: {
                    description: "Data to insert into the table. Must satisfy the table schema.",
                    record: { values: "any" },
                },
                onConflict: {
                    enum: ["DoNothing", "DoUpdate"],
                    optional: true,
                    description: fixIndent(`
              By default the insert may fail due to a unique/exclusion constraint violation error. To control this:
              - DoNothing: will ignore the error and do nothing
              - DoUpdate: will update all non conflicting columns of the conflicting row`),
                },
                returning: Object.assign({ description: "Fields to return for newly inserted data. Nothing will be returned otherwise" }, selectSchema),
            },
        },
        outputSchema: {
            optional: true,
            description: "Inserted row returned based on the returning fields. Nothing will be returned if returning is not provided.",
            record: {
                values: "any",
            },
        },
    },
    insertMany: {
        description: "Inserts rows into a table.",
        annotations: { readOnlyHint: false },
        schema: {
            type: {
                tableName: "string",
                data: {
                    description: "Data to insert into the table. Must satisfy the table schema.",
                    arrayOf: { record: { values: "any" } },
                },
                onConflict: {
                    enum: ["DoNothing", "DoUpdate"],
                    optional: true,
                    description: fixIndent(`
              By default the insert may fail due to a unique/exclusion constraint violation error. To control this:
              - DoNothing: will ignore the error and do nothing
              - DoUpdate: will update all non conflicting columns of the conflicting row`),
                },
                returning: Object.assign({ description: "Fields to return for newly inserted data. Nothing will be returned otherwise" }, selectSchema),
            },
        },
        outputSchema: Object.assign({ optional: true, description: "Inserted rows returned based on the returning fields. Nothing will be returned if returning is not provided." }, outputSchemaArrayOfObjects),
    },
    update: {
        description: "Updates rows in a table.",
        annotations: { destructiveHint: true, readOnlyHint: false },
        schema: {
            type: Object.assign(Object.assign({ tableName: "string" }, filterSchema), { data: {
                    description: "Data to insert into the table. Must satisfy the table schema.",
                    record: {
                        values: "any",
                    },
                }, removeDisallowedFields: {
                    type: "boolean",
                    optional: true,
                    description: "Whether to remove fields that are not allowed to be updated instead of throwing an error.",
                }, multi: {
                    description: "true by default. When set to false the update will throw an error if more than one row is updated (but the update will commit).",
                    type: "boolean",
                    optional: true,
                }, returning: Object.assign({ description: "Fields to return for updated data. Nothing will be returned otherwise" }, selectSchema) }),
        },
        outputSchema: {
            optional: true,
            oneOf: [
                {
                    record: {
                        values: "any",
                    },
                },
                outputSchemaArrayOfObjects,
            ],
        },
    },
    delete: {
        annotations: { destructiveHint: true, readOnlyHint: false },
        description: "Deletes rows from a table.",
        schema: {
            type: Object.assign(Object.assign({ tableName: "string" }, filterSchema), { returning: Object.assign({ description: "Fields to return for the deleted rows. Nothing will be returned otherwise" }, selectSchema) }),
        },
        outputSchema: {
            oneOf: [outputSchemaArrayOfObjects, { enum: [undefined] }],
        },
    },
};
