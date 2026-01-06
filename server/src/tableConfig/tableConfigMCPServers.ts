import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";

export const tableConfigMCPServers: TableConfig<{ en: 1 }> = {
  mcp_servers: {
    columns: {
      name: `TEXT PRIMARY KEY`,
      info: `TEXT`,
      icon_path: `TEXT`,
      source: {
        nullable: true,
        jsonbSchema: {
          oneOfType: [
            {
              type: { enum: ["github"] },
              name: "string",
              repoUrl: "string",
              installationCommands: {
                arrayOfType: {
                  command: "string",
                  args: { type: "string[]", optional: true },
                },
                optional: true,
              },
            },
            {
              type: { enum: ["code"] },
              packageJson: "string",
              tsconfigJson: "string",
              files: {
                record: { values: "string" },
              },
            },
          ],
        },
      },
      command: {
        enum: ["npx", "npm", "uvx", "uv", "docker", "prostgles-local"],
      },
      config_schema: {
        jsonbSchema: {
          record: {
            values: {
              oneOfType: [
                {
                  type: { enum: ["env"] },
                  renderWithComponent: { type: "string", optional: true },
                  title: { type: "string", optional: true },
                  optional: { type: "boolean", optional: true },
                  description: { type: "string", optional: true },
                },
                {
                  type: { enum: ["arg"] },
                  renderWithComponent: { type: "string", optional: true },
                  title: { type: "string", optional: true },
                  optional: { type: "boolean", optional: true },
                  description: { type: "string", optional: true },
                  index: { type: "integer", optional: true },
                },
              ],
            },
          },
        },
        nullable: true,
      },
      cwd: `TEXT`,
      args: `TEXT[]`,
      stderr: "TEXT",
      env: {
        nullable: true,
        jsonbSchema: {
          record: {
            values: "string",
          },
        },
      },
      env_from_main_process: `TEXT[]`,
      enabled: `BOOLEAN NOT NULL DEFAULT FALSE`,
      created: `TIMESTAMPTZ DEFAULT NOW()`,
      installed: `TIMESTAMPTZ`,
    },
  },
  mcp_server_configs: {
    columns: {
      id: `SERIAL PRIMARY KEY`,
      server_name: `TEXT NOT NULL REFERENCES mcp_servers(name) ON DELETE CASCADE`,
      config: { jsonbSchema: { record: { values: "any" } } },
      created: `TIMESTAMPTZ DEFAULT NOW()`,
      last_updated: `TIMESTAMPTZ DEFAULT NOW()`,
    },
    constraints: {
      unique_server_and_config: {
        type: "UNIQUE",
        content: "server_name, config",
      },
      unique_server_and_id: {
        type: "UNIQUE",
        content: "server_name, id",
      },
    },
  },
  mcp_server_tools: {
    columns: {
      id: `SERIAL PRIMARY KEY`,
      name: `TEXT NOT NULL`,
      description: `TEXT NOT NULL`,
      server_name: `TEXT NOT NULL REFERENCES mcp_servers(name) ON DELETE CASCADE`,
      inputSchema: `JSONB`,
      annotations: {
        jsonbSchemaType: {
          title: {
            type: "string",
            optional: true,
            title: "Human-readable title for the tool",
          },
          readOnlyHint: {
            type: "boolean",
            optional: true,
            title:
              "If true, tool does not modify its environment (read-only). ",
          },
          openWorldHint: {
            type: "boolean",
            optional: true,
            title: "If true, tool interacts with external entities",
          },
          idempotentHint: {
            type: "boolean",
            optional: true,
            title:
              "If true, repeated calls with same args have no additional effect",
          },
          destructiveHint: {
            type: "boolean",
            optional: true,
            title: "If true, the tool may perform destructive updates",
          },
        },
        nullable: true,
      },
      autoApprove: `BOOLEAN DEFAULT FALSE`,
    },
    indexes: {
      unique_server_name_tool_name: {
        unique: true,
        columns: "server_name, name",
      },
    },
  },
  mcp_server_logs: {
    columns: {
      id: `SERIAL PRIMARY KEY`,
      server_name: `TEXT NOT NULL REFERENCES mcp_servers(name) ON DELETE CASCADE`,
      log: `TEXT NOT NULL DEFAULT ''`,
      error: `TEXT`,
      install_log: `TEXT`,
      install_error: `TEXT`,
      last_updated: `TIMESTAMPTZ DEFAULT NOW()`,
    },
  },
  mcp_server_tool_calls: {
    columns: {
      id: `SERIAL PRIMARY KEY `,
      chat_id: `INTEGER REFERENCES llm_chats(id) ON DELETE SET NULL`,
      user_id: `UUID REFERENCES users(id) ON DELETE SET NULL`,
      mcp_server_name: `TEXT REFERENCES mcp_servers(name) ON DELETE SET NULL`,
      mcp_tool_name: `TEXT NOT NULL`,
      mcp_server_config_id: `INTEGER`,
      input: `JSONB`,
      output: `JSONB`,
      error: `JSON`,
      called: `TIMESTAMPTZ DEFAULT NOW()`,
      duration: `INTERVAL NOT NULL`,
    },
    constraints: {
      mcp_tool_name_server_name_fk:
        "FOREIGN KEY (mcp_server_name, mcp_tool_name) REFERENCES mcp_server_tools(server_name, name) ON DELETE SET NULL",
      mcp_server_config_id_fk:
        "FOREIGN KEY (mcp_server_name, mcp_server_config_id) REFERENCES mcp_server_configs(server_name, id) ON DELETE SET NULL",
    },
  },
  llm_chats_allowed_mcp_tools: {
    info: {
      label: "Allowed MCP tools",
    },
    columns: {
      chat_id: `INTEGER NOT NULL REFERENCES llm_chats(id) ON DELETE CASCADE`,
      server_name: `TEXT NOT NULL REFERENCES mcp_servers ON DELETE CASCADE`,
      tool_id: `INTEGER NOT NULL REFERENCES mcp_server_tools(id) ON DELETE CASCADE`,
      server_config_id: `INTEGER REFERENCES mcp_server_configs ON DELETE CASCADE`,
      auto_approve: `BOOLEAN DEFAULT FALSE`,
    },
    indexes: {
      unique_chat_allowed_tool: {
        unique: true,
        columns: "chat_id, tool_id",
      },
    },
  },
};
