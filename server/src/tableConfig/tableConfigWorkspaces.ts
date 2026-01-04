import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";

export const tableConfigWorkspaces: TableConfig<{ en: 1 }> = {
  workspace_layout_modes: {
    isLookupTable: {
      values: {
        fixed: {
          en: "Fixed",
          description: "The workspace layout is fixed. Only admins can edit",
        },
        editable: {
          en: "Editable",
          description:
            "The workspace will be cloned for each user to allow editing",
        },
      },
    },
  },

  workspaces: {
    columns: {
      id: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`,
      parent_workspace_id: `UUID REFERENCES workspaces(id) ON DELETE SET NULL`,
      user_id: `UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE`,
      connection_id: `UUID NOT NULL REFERENCES connections(id)  ON DELETE CASCADE`,
      name: `TEXT NOT NULL DEFAULT 'default workspace' CHECK(length(BTRIM(name)) > 0)`,
      created: `TIMESTAMPTZ DEFAULT NOW()`,
      active_row: `JSONB DEFAULT '{}'::jsonb`,
      layout: `JSONB`,
      icon: `TEXT`,
      options: {
        defaultValue: {
          defaultLayoutType: "tab",
          tableListEndInfo: "size",
          tableListSortBy: "extraInfo",
          hideCounts: false,
          pinnedMenu: true,
        },
        jsonbSchemaType: {
          hideCounts: {
            optional: true,
            type: "boolean",
          },
          tableListEndInfo: {
            optional: true,
            enum: ["none", "count", "size"],
          },
          tableListSortBy: {
            optional: true,
            enum: ["name", "extraInfo"],
          },
          showAllMyQueries: {
            optional: true,
            type: "boolean",
          },
          defaultLayoutType: {
            optional: true,
            enum: ["row", "tab", "col"],
          },
          pinnedMenu: {
            optional: true,
            type: "boolean",
          },
          pinnedMenuWidth: {
            optional: true,
            type: "number",
          },
        },
      },
      last_updated: `BIGINT NOT NULL`,
      last_used: `TIMESTAMPTZ NOT NULL DEFAULT now()`,
      deleted: `BOOLEAN NOT NULL DEFAULT FALSE`,
      url_path: `TEXT`,
      published: {
        sqlDefinition: `BOOLEAN NOT NULL DEFAULT FALSE, CHECK(parent_workspace_id IS NULL OR published = FALSE)`,
        info: {
          hint: "If true then this workspace can be shared with other users through Access Control",
        },
      },
      layout_mode: {
        nullable: true,
        references: { tableName: "workspace_layout_modes" },
      },
      source: {
        nullable: true,
        jsonbSchemaType: {
          tool_use_id: "string",
        },
      },
    },
    constraints: {
      unique_url_path: `UNIQUE(url_path)`,
      unique_name_per_user_perCon: `UNIQUE(connection_id, user_id, name)`,
    },
  },
};
