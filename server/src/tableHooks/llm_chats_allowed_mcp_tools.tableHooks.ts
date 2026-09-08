import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { isDefined } from "@common/filterUtils";
import { getDefaultMcpConfig } from "@common/mcp/web.mcp.schema";
import type { TableHooks } from "prostgles-server";

export const llmChatsAllowedMcpToolsTableHooks: TableHooks<DBGeneratedSchema> =
  {
    llm_chats_allowed_mcp_tools: {
      afterAll: [
        {
          commands: { insert: 1, update: 1 },
          validate: async (args) => {
            const { dbx, data: _data, rows } = args;

            const data = _data as typeof rows;
            const serverNames = Array.from(
              new Set(data.map((row) => row.server_name).filter(isDefined)),
            );
            const serversWithoutConfigId = Array.from(
              new Set(
                data
                  .map((row) =>
                    row.server_config_id ? undefined : row.server_name,
                  )
                  .filter(isDefined),
              ),
            );
            const serversThatNeedConfigs = await dbx.mcp_servers.find(
              {
                name: { $in: serversWithoutConfigId },
                config_schema: { $ne: null },
              },
              { select: { name: 1, config_schema: 1 } },
            );

            const defaultServerConfigs = serversThatNeedConfigs
              .map((server) => {
                const defaultConfig = getDefaultMcpConfig(server.config_schema);
                if (!defaultConfig) {
                  return;
                }
                return {
                  server,
                  defaultConfig,
                };
              })
              .filter(isDefined);

            if (
              serversThatNeedConfigs.length &&
              serversThatNeedConfigs.length === defaultServerConfigs.length
            ) {
              for (const { server, defaultConfig } of defaultServerConfigs) {
                const configData = {
                  server_name: server.name,
                  config: defaultConfig,
                };
                const config =
                  (await dbx.mcp_server_configs.findOne(configData)) ||
                  (await dbx.mcp_server_configs.insert(configData, {
                    returning: { id: 1 },
                  }));
                const conditions = rows
                  .filter(
                    (row) =>
                      row.server_name === server.name &&
                      !Number.isFinite(row.server_config_id),
                  )
                  .map(({ server_name, tool_id, chat_id }) => ({
                    server_name,
                    tool_id,
                    chat_id,
                  }));
                if (!conditions.length) {
                  throw new Error(
                    `No conditions found for server ${server.name} to update server_config_id`,
                  );
                }
                await dbx.llm_chats_allowed_mcp_tools.update(
                  {
                    $or: conditions,
                  },
                  {
                    server_config_id: config.id,
                  },
                );
              }
            } else if (serversThatNeedConfigs.length) {
              throw new Error(
                `MCP Servers ${JSON.stringify(
                  serversThatNeedConfigs.map((s) => s.name).join(", "),
                )} require a server_config_id to be set for allowed tools. Please provide a valid server_config_id.`,
              );
            }

            if (serverNames.length) {
              await dbx.mcp_servers.update(
                {
                  name: { $in: serverNames },
                  enabled: false,
                },
                {
                  enabled: true,
                },
              );
            }
          },
        },
      ],
    },
  };
