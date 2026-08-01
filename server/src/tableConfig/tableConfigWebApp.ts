import type { TableConfig } from "prostgles-server";

export const tableConfigWebApp: TableConfig<{ en: 1 }> = {
  tableConfigWebApp: {
    columns: {
      connection_id: "UUID NOT NULL REFERENCES connections(id)",
      port: `INTEGER`,
      files: {
        jsonbSchema: {
          record: {
            values: "string",
          },
        },
      },
    },
  },
};
