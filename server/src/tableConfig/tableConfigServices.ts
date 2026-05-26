import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";

export const tableConfigServices: TableConfig<{ en: 1 }> = {
  services: {
    columns: {
      name: `TEXT PRIMARY KEY`,
      label: `TEXT NOT NULL UNIQUE`,
      description: `TEXT`,
      icon: `TEXT NOT NULL`,
      default_port: `INTEGER NOT NULL`,
      build_hash: `TEXT`,
      /** Used to allow developing web apps for each connection */
      connection_id: `UUID REFERENCES connections(id) ON DELETE SET NULL`,
      status: {
        enum: [
          "stopped",
          "starting",
          "running",
          "error",
          "building",
          "building-done",
          "build-error",
        ],
      },
      configs: {
        nullable: true,
        jsonbSchema: {
          record: {
            values: {
              type: {
                label: "string",
                description: "string",
                defaultOption: "string",
                options: {
                  record: {
                    values: {
                      type: {
                        label: { type: "string", optional: true },
                        env: { record: { values: "string" } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      selected_config_options: {
        nullable: true,
        jsonbSchema: {
          record: {
            values: { type: "string" },
          },
        },
      },
      logs: `TEXT`,
      created: `TIMESTAMPTZ DEFAULT NOW()`,
    },
  },
};
