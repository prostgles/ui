import { tablePermissionsSchema } from "./tablePermissionsSchema";

export const databaseAccessSchema = {
  optional: true,
  description:
    "Database access configuration. Use the most restrictive access type that is needed to complete the task.",
  oneOfType: [
    {
      mode: {
        enum: ["execute_readonly_sql"],
      },
    },
    {
      mode: {
        enum: ["execute_sql"],
      },
      allowedCommands: {
        optional: true,
        record: {
          partial: true,
          keysEnum: ["select", "insert", "update", "delete"],
          values: {
            enum: [1],
          },
        },
      },
    },
    {
      mode: { enum: ["custom"] },
      tablePermissions: tablePermissionsSchema,
      ddlStatements: {
        description: "Table create statements",
        type: "string",
        optional: true,
      },
    },
  ],
} as const;
