import type { DBSSchema } from "@common/publishUtils";
import type { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio";
import {
  getProperty,
  getSerialisableError,
  isDefined,
  pickKeys,
} from "prostgles-types";
import type { DBS } from "..";
import { getRemoteMcpServerParameters } from "./AnthropicMcpHub/McpOAuth/getRemoteMcpServerParameters";
import type {
  McpServerEvents,
  McpServerParameters,
  ServersConfig,
} from "./AnthropicMcpHub/McpTypes";

export const getMcpServerParameters = async (
  dbs: DBS,
  testConfig?: DBSSchema["mcp_server_configs"],
) => {
  const serversConfig: ServersConfig = new Map();
  const mcpServers = await dbs.mcp_servers.find(
    testConfig ?
      { name: testConfig.server_name }
    : { enabled: true, command: { $ne: "prostgles-local" } },
    { select: { "*": 1, mcp_server_configs: "*" } },
  );
  const globalSettings = await dbs.global_settings.findOne();
  if (globalSettings?.mcp_servers_disabled) {
    return serversConfig;
  }

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
    const onLog: McpServerEvents["onLog"] = (item, log) => {
      void dbs.mcp_server_logs.upsert(
        { server_name: server.name },
        item.type === "stderr" ?
          {
            log,
          }
        : {
            log,
            error: JSON.stringify(getSerialisableError(item.data)),
          },
      );
      if (item.type === "error") {
        void dbs.mcp_servers.update(
          {
            name: server.name,
          },
          {
            enabled: false,
          },
        );
        void dbs.alerts.insert({
          severity: "error",
          title: server.name + " MCP server disabled due to error",
          message: log,
          ui_path: {
            page: "/server-settings",
            section: "mcpServers",
          },
        });
      }
    };

    const { config_schema } = server;
    const mcp_server_configs =
      testConfig?.server_name === server.name ?
        [testConfig]
      : ((server.mcp_server_configs ??
          []) as DBSSchema["mcp_server_configs"][]);

    if (mcp_server_configs.length) {
      mcp_server_configs.forEach((mcp_server_config) => {
        const serverInstanceName = server.name + "_" + mcp_server_config.id;
        const serverConfig = (() => {
          if (server.command === "streamable-http") {
            return getRemoteMcpServerParameters({
              dbs,
              server,
              mcp_server_config,
              onLog,
            });
          }
          if (!config_schema) {
            throw new Error(
              `MCP server "${server.name}" has no config_schema but has mcp_server_configs.`,
            );
          }
          const { args, env } = applyConfig(
            {
              args: baseArgs,
              env: baseEnv,
            },
            config_schema,
            mcp_server_config,
          );
          return {
            type: "stdio",
            ...server,
            server_name: server.name,
            args,
            env,
            stderr: undefined,
            cwd: server.cwd ?? undefined,
            onLog,
          } satisfies McpServerParameters;
        })();
        if (serverConfig) {
          serversConfig.set(serverInstanceName, serverConfig);
        }
      });
    } else {
      if (server.command === "streamable-http") {
        const message = `MCP server "${server.name}" has command "streamable-http" but no config_schema or mcp_server_configs.`;
        void dbs.mcp_server_logs.upsert(
          { server_name: server.name },
          {
            install_error: message,
            error: message,
            log: message,
          },
        );
      } else {
        serversConfig.set(server.name, {
          type: "stdio",
          ...server,
          server_name: server.name,
          args: baseArgs,
          env: baseEnv,
          stderr: undefined,
          cwd: server.cwd ?? undefined,
          onLog,
        } satisfies McpServerParameters);
      }
    }
  });
  return serversConfig;
};

const applyConfig = (
  {
    args: baseArgs,
    env: baseEnv,
  }: Required<Pick<StdioServerParameters, "args" | "env">>,
  config_schema: NonNullable<DBSSchema["mcp_servers"]["config_schema"]>,
  {
    server_name,
    config,
  }: Pick<DBSSchema["mcp_server_configs"], "server_name" | "config">,
) => {
  let args = [...baseArgs];
  const env = { ...baseEnv };
  if (config.type !== "local") {
    throw new Error(
      `MCP server "${server_name}" has config type "${config.type}", expected "local"`,
    );
  }
  Object.entries({ ...config_schema }).forEach(([key, configItem]) => {
    const value = getProperty(config.value, key);
    if (configItem.type === "env" || configItem.type === "local") {
      env[key] = value as string;
    } else {
      const dollarArgIndexes = args
        .map((a, i) => (a.startsWith("${") ? i : undefined))
        .filter(isDefined);
      if (dollarArgIndexes.length > 1) {
        throw new Error(
          `Config schema for server "${server_name}" has multiple args with ${"{"}...{""} syntax, which is not supported.`,
        );
      }
      const argIndex = configItem.index ?? dollarArgIndexes[0];
      if (isFinite(argIndex) && argIndex > -1) {
        if (configItem.type === "...args" && Array.isArray(value)) {
          args = [
            ...args.slice(0, argIndex),
            ...(value as string[]),
            ...args.slice(argIndex + 1),
          ];
        } else {
          args[argIndex] = value as string;
        }
      } else {
        console.error(
          `Invalid index for arg "${key}" in server "${server_name}"`,
        );
      }
    }
  });
  return { args, env };
};

const isFinite = (value: unknown): value is number => Number.isFinite(value);
