import { isDefined, pickKeys, type ValueOf } from "prostgles-types";
import type { DBS } from "..";
import type { DBSSchema } from "../../../common/publishUtils";
import type { ServersConfig } from "./McpTypes";

export const fetchMCPServerConfigs = async (
  dbs: DBS,
  testConfig?: Pick<DBSSchema["mcp_server_configs"], "server_name" | "config">,
): Promise<ServersConfig> => {
  const mcpServers = await dbs.mcp_servers.find(
    testConfig ?
      { name: testConfig.server_name }
    : { enabled: true, command: { $ne: "prostgles-local" } },
    { select: { "*": 1, mcp_server_configs: "*" } },
  );
  const globalSettings = await dbs.global_settings.findOne();
  if (globalSettings?.mcp_servers_disabled) {
    return {};
  }

  const serversConfig: ServersConfig = Object.fromEntries(
    mcpServers.map((server) => {
      const { config_schema } = server;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              env[key] = config?.[key];
            } else {
              const dollarArgIndexes = args
                .map((a, i) => (a.startsWith("${") ? i : undefined))
                .filter(isDefined);
              const argIndex = dollarArgIndexes[configItem.index ?? itemIndex];
              if (argIndex) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                args[argIndex] = config?.[key];
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
          cwd: server.cwd ?? undefined,
          onLog: (type, data, log) => {
            void dbs.mcp_server_logs.upsert(
              { server_name: server.name },
              type === "stderr" ?
                {
                  log,
                }
              : {
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
