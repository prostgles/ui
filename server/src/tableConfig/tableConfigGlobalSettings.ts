import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";

export const tableConfigGlobalSettings: TableConfig<{ en: 1 }> = {
  global_settings: {
    // dropIfExistsCascade: true,
    columns: {
      id: "INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY",
      prostgles_registration: {
        info: { hint: "Registration options" },
        nullable: true,
        jsonbSchemaType: {
          enabled: { type: "boolean" },
          email: { type: "string" },
          token: { type: "string" },
        },
      },
      updated_by: {
        enum: ["user", "app"],
        defaultValue: "app",
      },
      updated_at: {
        sqlDefinition: "TIMESTAMPTZ NOT NULL DEFAULT now()",
      },
      mcp_servers_disabled: "BOOLEAN NOT NULL DEFAULT FALSE",
    },
    triggers: {
      "Update updated_at": {
        actions: ["update"],
        type: "before",
        forEach: "row",
        query: `
          BEGIN
            NEW.updated_at = now();
            RETURN NEW;
          END;
        `,
      },
    },
  },
};
