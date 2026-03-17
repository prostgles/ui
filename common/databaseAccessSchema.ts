import { tablePermissionsSchema } from "./tablePermissionsSchema";

export const databaseAccessSchema = {
  optional: true,
  description:
    "Database access configuration. Use the most restrictive access type that is needed to complete the task.",
  oneOfType: [
    {
      mode: {
        enum: ["execute_readonly_sql", "execute_sql"],
      },
    },
    {
      mode: { enum: ["custom"] },
      tablePermissions: tablePermissionsSchema,
      ddlStatements: { type: "string", optional: true },
    },
  ],
} as const;
