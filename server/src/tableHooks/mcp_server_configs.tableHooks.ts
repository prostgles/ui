import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { testMCPServerConfig } from "@src/McpHub/testMCPServerConfig";
import type { TableHooks } from "prostgles-server";

export const mcpServerConfigsTableHooks: TableHooks<DBGeneratedSchema> = {
  mcp_server_configs: {
    afterEach: [
      {
        commands: { update: 1 },
        validate: async (args) => {
          const { dbx, row } = args;
          if (row.oauth) {
            return;
          }
          await testMCPServerConfig(dbx, row);
        },
      },
    ],
    afterAll: [
      {
        commands: { delete: 1 },
        validate: async (args) => {
          await args.dbx.mcp_servers.update(
            {
              $and: [
                {
                  $or: [
                    { command: "streamable-http" },
                    { config_schema: { $ne: null } },
                  ],
                },
                {
                  $notExistsJoined: {
                    mcp_server_configs: {},
                  },
                },
              ],
            },
            { enabled: false },
          );
        },
      },
    ],
  },
};
