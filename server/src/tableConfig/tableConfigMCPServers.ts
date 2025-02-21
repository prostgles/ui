import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";

export const tableConfigMCPServers: TableConfig<{ en: 1 }> = {
  mcp_install_logs: {
    columns: {
      id: `TEXT PRIMARY KEY`,
      log: `TEXT NOT NULL`,
      created: `TIMESTAMP DEFAULT NOW()`,
      finished: `TIMESTAMP`,
      error: `TEXT`,
      last_updated: `TIMESTAMP DEFAULT NOW()`,
    },
  },
  mcp_servers: {
    columns: {
      name: `TEXT PRIMARY KEY`,
      info: `TEXT`,
      github_url: `TEXT NOT NULL`,
      command: `TEXT NOT NULL`,
      config_schema: `JSONB`,
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
      enabled: `BOOLEAN DEFAULT FALSE`,
      created: `TIMESTAMP DEFAULT NOW()`,
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
      description: `TEXT`,
      server_name: `TEXT NOT NULL REFERENCES mcp_servers(name) ON DELETE CASCADE`,
      input_schema: `JSONB`,
    },
  },
  mcp_server_logs: {
    columns: {
      id: `SERIAL PRIMARY KEY`,
      server_name: `TEXT NOT NULL REFERENCES mcp_servers(name) ON DELETE CASCADE`,
      log: `TEXT NOT NULL`,
      created: `TIMESTAMP DEFAULT NOW()`,
    },
  },
};
