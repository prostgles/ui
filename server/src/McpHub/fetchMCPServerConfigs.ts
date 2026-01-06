import { isDefined, pickKeys, type ValueOf } from "prostgles-types";
import type { DBS } from "..";
import type { DBSSchema } from "@common/publishUtils";
import type {
  McpConfigWithEvents,
  ServersConfig,
} from "./AnthropicMcpHub/McpTypes";

export const fetchMCPServerConfigs = async (
  dbs: DBS,
  testConfig?: DBSSchema["mcp_server_configs"],
) => {
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

  const serversConfig: ServersConfig = {};
  mcpServers.forEach((server) => {
    const baseEnv = {
      /** Needed for puppeteer/playwright */
      ...(server.env_from_main_process?.length &&
        (pickKeys(process.env, server.env_from_main_process) as Record<
          string,
          string
        >)),
      ...(server.env ?? {}),
    };
    const baseArgs = server.args ?? [];
    const onLog: McpConfigWithEvents["onLog"] = (type, data, log) => {
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
    };

    const { config_schema } = server;
    const mcp_server_configs =
      testConfig?.server_name === server.name ?
        [testConfig]
      : ((server.mcp_server_configs ??
          []) as DBSSchema["mcp_server_configs"][]);
    if (config_schema && mcp_server_configs.length) {
      mcp_server_configs.forEach((mcp_server_config) => {
        const { args, env } = applyConfig(
          {
            args: baseArgs,
            env: baseEnv,
          },
          config_schema,
          mcp_server_config,
        );
        serversConfig[server.name + "_" + mcp_server_config.id] = {
          ...server,
          server_name: server.name,
          args,
          env,
          stderr: undefined,
          cwd: server.cwd ?? undefined,
          onLog,
        } satisfies ValueOf<ServersConfig>;
      });
    } else {
      serversConfig[server.name] = {
        ...server,
        server_name: server.name,
        args: baseArgs,
        env: baseEnv,
        stderr: undefined,
        cwd: server.cwd ?? undefined,
        onLog,
      } satisfies ValueOf<ServersConfig>;
    }
  });
  return serversConfig;
};

const applyConfig = (
  {
    args: baseArgs,
    env: baseEnv,
  }: Required<Pick<McpConfigWithEvents, "args" | "env">>,
  config_schema: NonNullable<DBSSchema["mcp_servers"]["config_schema"]>,
  {
    server_name,
    config,
  }: Pick<DBSSchema["mcp_server_configs"], "server_name" | "config">,
) => {
  const args = [...baseArgs];
  const env = { ...baseEnv };
  Object.entries({ ...config_schema }).forEach(
    ([key, configItem], itemIndex) => {
      if (configItem.type === "env") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        env[key] = config[key];
      } else {
        const dollarArgIndexes = args
          .map((a, i) => (a.startsWith("${") ? i : undefined))
          .filter(isDefined);
        const argIndex = dollarArgIndexes[configItem.index ?? itemIndex];
        if (argIndex) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          args[argIndex] = config[key];
        } else {
          console.error(
            `Invalid index for arg "${key}" in server "${server_name}"`,
          );
        }
      }
    },
  );
  return { args, env };
};
