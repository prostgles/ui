import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";

export const tableConfigWindows = {
  windows: {
    columns: {
      id: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`,
      parent_window_id: {
        sqlDefinition: `UUID REFERENCES windows(id) ON DELETE CASCADE`,
        info: {
          hint: "If defined then this is a chart for another window and will be rendered within that parent window",
        },
      },
      user_id: `UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE`,
      /*   ON DELETE SET NULL is used to ensure we don't delete saved SQL queries */
      workspace_id: `UUID REFERENCES workspaces(id) ON DELETE SET NULL`,
      // type: `TEXT NOT NULL CHECK(type IN ('map', 'sql', 'table', 'timechart', 'card', 'method'))`,
      type: {
        nullable: true,
        enum: [
          "map",
          "sql",
          "table",
          "timechart",
          "card",
          "method",
          "barchart",
        ],
      },
      table_name: `TEXT`,
      method_name: `TEXT`,
      table_oid: `INTEGER`,
      sql: `TEXT NOT NULL DEFAULT ''`,
      selected_sql: `TEXT NOT NULL DEFAULT ''`,
      name: `TEXT`,
      title: {
        sqlDefinition: `TEXT`,
        info: {
          hint: "Override name. Accepts ${rowCount} variable",
        },
      }, // Hacky way to set a fixed title
      limit: `INTEGER DEFAULT 1000 CHECK("limit" > -1 AND "limit" < 100000)`,
      closed: `BOOLEAN DEFAULT FALSE`,
      deleted: `BOOLEAN DEFAULT FALSE CHECK(NOT (type = 'sql' AND deleted = TRUE AND (options->>'sqlWasSaved')::boolean = true))`,
      show_menu: `BOOLEAN DEFAULT FALSE`,
      minimised: {
        info: { hint: "Used for attached charts to hide them" },
        sqlDefinition: `BOOLEAN DEFAULT FALSE`,
      },
      fullscreen: `BOOLEAN DEFAULT TRUE`,
      sort: "JSONB DEFAULT '[]'::jsonb",
      filter: `JSONB NOT NULL DEFAULT '[]'::jsonb`,
      having: `JSONB NOT NULL DEFAULT '[]'::jsonb`,
      options: `JSONB NOT NULL DEFAULT '{}'::jsonb`,
      sql_options: {
        defaultValue: {
          executeOptions: "block",
          errorMessageDisplay: "both",
          tabSize: 2,
        },
        jsonbSchemaType: {
          executeOptions: {
            optional: true,
            description:
              "Behaviour of execute (ALT + E). Defaults to 'block' \nfull = run entire sql   \nblock = run code block where the cursor is",
            enum: ["full", "block", "smallest-block"],
          },
          errorMessageDisplay: {
            optional: true,
            description:
              "Error display locations. Defaults to 'both' \ntooltip = show within tooltip only   \nbottom = show in bottom control bar only   \nboth = show in both locations",
            enum: ["tooltip", "bottom", "both"],
          },
          tabSize: {
            type: "integer",
            optional: true,
          },
          lineNumbers: {
            optional: true,
            enum: ["on", "off"],
          },
          renderMode: {
            optional: true,
            description: "Show query results in a table or a JSON",
            enum: ["table", "csv", "JSON"],
          },
          minimap: {
            optional: true,
            description: "Shows a vertical code minimap to the right",
            type: { enabled: { type: "boolean" } },
          },
          acceptSuggestionOnEnter: {
            description: "Insert suggestions on Enter. Tab is the default key",
            optional: true,
            enum: ["on", "smart", "off"],
          },
          expandSuggestionDocs: {
            optional: true,
            description:
              "Toggle suggestions documentation tab. Requires page refresh. Enabled by default",
            type: "boolean",
          },
          maxCharsPerCell: {
            type: "integer",
            optional: true,
            description:
              "Defaults to 1000. Maximum number of characters to display for each cell. Useful in improving performance",
          },
          theme: {
            optional: true,
            enum: ["vs", "vs-dark", "hc-black", "hc-light"],
          },
          showRunningQueryStats: {
            optional: true,
            description:
              "(Experimental) Display running query stats (CPU and Memory usage) in the bottom bar",
            type: "boolean",
          },
        },
      },
      columns: `JSONB`,
      nested_tables: `JSONB`,
      created: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
      last_updated: `BIGINT NOT NULL`,
    },
  },
} satisfies TableConfig<{ en: 1 }>;
