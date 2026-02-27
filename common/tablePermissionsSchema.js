// import type { JSONB } from "prostgles-types";
export const fieldFilterSchema = {
    oneOf: [
        { enum: ["*"] },
        {
            record: {
                values: {
                    enum: [1],
                },
            },
        },
        {
            record: {
                values: {
                    enum: [0],
                },
            },
        },
    ],
}; // satisfies JSONB.FieldType;
export const forcedFilterSchema = {
    optional: true,
    oneOfType: [
        {
            $and: "any[]",
        },
        {
            $or: "any[]",
        },
    ],
}; // satisfies JSONB.FieldType;
export const tablePermissionsSchema = {
    title: "Tables",
    description: "Tables the assistant can access",
    record: {
        values: {
            type: {
                /** TODO: this must re-use access control data and UI */
                select: {
                    oneOf: [
                        { enum: [true] },
                        {
                            type: {
                                forcedFilter: forcedFilterSchema,
                                fields: fieldFilterSchema,
                            },
                        },
                    ],
                    optional: true,
                },
                update: {
                    oneOf: [
                        { enum: [true] },
                        {
                            type: {
                                forcedFilter: forcedFilterSchema,
                                fields: fieldFilterSchema,
                            },
                        },
                    ],
                    optional: true,
                },
                insert: {
                    oneOf: [
                        { enum: [true] },
                        {
                            type: {
                                fields: fieldFilterSchema,
                            },
                        },
                    ],
                    optional: true,
                },
                delete: {
                    oneOf: [
                        { enum: [true] },
                        {
                            type: {
                                forcedFilter: forcedFilterSchema,
                            },
                        },
                    ],
                    optional: true,
                },
                // columns: {
                //   optional: true,
                //   type: "Lookup[]",
                //   lookup: {
                //     type: "schema",
                //     object: "column",
                //   },
                //   description:
                //     "Columns the assistant can access in the table",
                // },
            },
        },
    },
}; // satisfies JSONB.FieldType;
