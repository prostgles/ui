// import type { JSONB } from "prostgles-types";
const fields = {
    optional: true,
    oneOf: [
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
const forcedFilter = {
    optional: true,
    record: {},
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
                                forcedFilter,
                                fields,
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
                                forcedFilter,
                                fields,
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
                                fields,
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
                                forcedFilter,
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
