import { isDefined, pickKeys, type ValueOf } from "prostgles-types";
import type { DBS } from "..";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import type { ServersConfig } from "./McpTypes";

export const fetchMCPServerConfigs = async (
  dbs: DBS,
  testConfig?: Pick<DBSSchema["mcp_server_configs"], "server_name" | "config">,
): Promise<ServersConfig> => {
  const mcpServers = await dbs.mcp_servers.find(
    {
      $or: [
        { enabled: true },
        testConfig && { name: testConfig.server_name },
      ].filter(isDefined),
    },
    { select: { "*": 1, mcp_server_configs: "*" } },
  );
  const globalSettings = await dbs.global_settings.findOne();
  if (globalSettings?.mcp_servers_disabled) {
    return {};
  }

  const serversConfig: ServersConfig = Object.fromEntries(
    mcpServers.map((server) => {
      const { config_schema, ...rest } = server;
      const mcp_server_configs: DBSSchema["mcp_server_configs"][] =
        server.mcp_server_configs ?? [];
      const config =
        testConfig?.server_name === server.name ?
          testConfig.config
        : mcp_server_configs[0]?.config;

      const env = {
        /** Needed for puppeteer/playwright */
        ...(server.env_from_main_process?.length &&
          (pickKeys(process.env, server.env_from_main_process) as Record<
            string,
            string
          >)),
        ...(server.env ?? {}),
      };
      const args = server.args ?? [];
      if (config_schema) {
        Object.entries(config_schema).forEach(
          ([key, configItem], itemIndex) => {
            if (configItem.type === "env") {
              env[key] = config[key];
            } else {
              const dollarArgIndexes = args
                .map((a, i) => (a.startsWith("${") ? i : undefined))
                .filter(isDefined);
              const argIndex = dollarArgIndexes[configItem.index ?? itemIndex];
              if (argIndex) {
                args[argIndex] = config[key];
              } else {
                console.error(
                  `Invalid index for arg "${key}" in server "${server.name}"`,
                );
              }
            }
          },
        );
      }
      return [
        server.name,
        {
          ...server,
          args,
          env,
          stderr: undefined,
          cwd: server.cwd,
          onLog: async (type, data, log) => {
            dbs.mcp_server_logs.upsert(
              { server_name: server.name },
              type === "stderr" ?
                {
                  log,
                }
              : {
                  log,
                  error: data,
                },
            );
          },
        } satisfies ValueOf<ServersConfig>,
      ];
    }),
  );
  return serversConfig;
};
