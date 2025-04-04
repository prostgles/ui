import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";

export const tableConfigMCPServers: TableConfig<{ en: 1 }> = {
  mcp_servers: {
    columns: {
      name: `TEXT PRIMARY KEY`,
      info: `TEXT`,
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
              indexTs: "string",
              packageJson: "string",
              tsconfigJson: "string",
            },
          ],
        },
      },
      command: { enum: ["npx", "npm", "uvx", "uv"] },
      config_schema: {
        jsonbSchema: {
          record: {
            values: {
              oneOfType: [
                {
                  type: { enum: ["env"] },
                  title: { type: "string", optional: true },
                  optional: { type: "boolean", optional: true },
                  description: { type: "string", optional: true },
                },
                {
                  type: { enum: ["arg"] },
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
      cwd: `TEXT NOT NULL`,
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
      created: `TIMESTAMP DEFAULT NOW()`,
      installed: `TIMESTAMP`,
      last_updated: `TIMESTAMP DEFAULT NOW()`,
    },
  },
  mcp_server_configs: {
    columns: {
      id: `SERIAL PRIMARY KEY`,
      server_name: `TEXT NOT NULL REFERENCES mcp_servers(name) ON DELETE CASCADE`,
      config: `JSONB NOT NULL`,
      created: `TIMESTAMP DEFAULT NOW()`,
      last_updated: `TIMESTAMP DEFAULT NOW()`,
    },
  },
  mcp_server_tools: {
    columns: {
      id: `SERIAL PRIMARY KEY`,
      name: `TEXT NOT NULL`,
      description: `TEXT NOT NULL`,
      server_name: `TEXT NOT NULL REFERENCES mcp_servers(name) ON DELETE CASCADE`,
      inputSchema: `JSONB`,
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
      log: `TEXT NOT NULL`,
      error: `TEXT`,
      install_log: `TEXT`,
      install_error: `TEXT`,
      last_updated: `TIMESTAMP DEFAULT NOW()`,
    },
  },
  mcp_server_tool_calls: {
    columns: {
      id: `SERIAL PRIMARY KEY`,
      chat_id: `INTEGER REFERENCES llm_chats(id) ON DELETE SET NULL`,
      user_id: `UUID REFERENCES users(id) ON DELETE SET NULL`,
      mcp_server_name: `TEXT NOT NULL REFERENCES mcp_servers(name) ON DELETE SET NULL`,
      mcp_tool_name: `TEXT NOT NULL, FOREIGN KEY  (mcp_server_name, mcp_tool_name) REFERENCES mcp_server_tools(server_name, name) ON DELETE SET NULL`,
      input: `JSONB`,
      output: `JSONB`,
      error: `JSON`,
      called: `TIMESTAMP DEFAULT NOW()`,
      duration: `INTERVAL NOT NULL`,
    },
  },
  llm_chats_allowed_mcp_tools: {
    info: {
      label: "Allowed MCP tools",
    },
    columns: {
      chat_id: `INTEGER NOT NULL REFERENCES llm_chats(id) ON DELETE CASCADE`,
      tool_id: `INTEGER REFERENCES mcp_server_tools(id) ON DELETE CASCADE`,
      allowed_inputs: {
        info: {
          hint: "If empty, all inputs are allowed. Otherwise only the listed inputs are allowed.",
        },
        nullable: true,
        jsonbSchema: {
          arrayOf: "any",
        },
      },
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
