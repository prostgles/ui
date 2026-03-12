import { tablePermissionsSchema } from "./tablePermissionsSchema";
export const databaseAccessSchema = {
    optional: true,
    description: "Database access configuration. Use the most restrictive access type that is needed to complete the task.",
    oneOfType: [
        {
            mode: {
                enum: ["execute_readonly_sql", "execute_sql_with_commit"],
            },
        },
        {
            mode: { enum: ["custom"] },
            tablePermissions: tablePermissionsSchema,
            tableCreateStatements: { type: "string", optional: true },
        },
    ],
};
