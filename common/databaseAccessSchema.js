import { tablePermissionsSchema } from "./tablePermissionsSchema";
export const databaseAccessSchema = {
    oneOfType: [
        { mode: { enum: ["none"] } },
        { mode: { enum: ["execute_sql_with_rollback"] } },
        { mode: { enum: ["execute_sql_with_commit"] } },
        {
            mode: { enum: ["custom"] },
            tablePermissions: tablePermissionsSchema,
        },
    ],
};
