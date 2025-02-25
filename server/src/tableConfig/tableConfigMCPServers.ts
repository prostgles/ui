import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";

export const tableConfigMCPServers: TableConfig<{ en: 1 }> = {
  mcp_servers: {
    columns: {
      name: `TEXT PRIMARY KEY`,
      info: `TEXT`,
      source: {
        jsonbSchema: {
          oneOfType: [
            {
              type: { enum: ["npm package"] },
              name: "string",
              version: { type: "string", optional: true },
            },
            {
              type: { enum: ["uvx"] },
            },
            {
              type: { enum: ["github repo"] },
              name: "string",
              repoUrl: "string",
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
      command: `TEXT NOT NULL`,
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
      enabled: `BOOLEAN DEFAULT FALSE`,
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
      description: `TEXT`,
      server_name: `TEXT NOT NULL REFERENCES mcp_servers(name) ON DELETE CASCADE`,
      inputSchema: `JSONB`,
      autoApprove: `BOOLEAN DEFAULT FALSE`,
    },
  },
  mcp_server_logs: {
    columns: {
      id: `SERIAL PRIMARY KEY`,
      server_name: `TEXT NOT NULL REFERENCES mcp_servers(name) ON DELETE CASCADE`,
      log: `TEXT NOT NULL`,
      install_log: `TEXT`,
      install_error: `TEXT`,
      last_updated: `TIMESTAMP DEFAULT NOW()`,
    },
  },
};
