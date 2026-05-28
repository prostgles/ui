import type { DBSSchemaForInsert } from "@common/publishUtils";
import { join } from "path";
import type { DBS } from "..";
import { getMCPDirectory } from "./AnthropicMcpHub/installMCPServer";
import { getDefaultMCPServers } from "./DefaultMCPServers/DefaultMCPServers";
import { getEntries } from "@common/utils";
import { isDefined } from "@common/filterUtils";

export const insertMcpServerList = async (dbs: DBS) => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!dbs.mcp_servers) {
    // Stale schema
    return;
  }
  const defaultServers = Object.entries(getDefaultMCPServers()).map(
    ([name, { ...server }]) => {
      return {
        name,
        cwd: server.source ? join(getMCPDirectory(), name) : getMCPDirectory(),
        ...server,
      } satisfies DBSSchemaForInsert["mcp_servers"];
    },
  );
  await dbs.mcp_servers.insertMany(defaultServers, { onConflict: "DoUpdate" });

  /** Insert default configs */
  const defaultConfigs = (
    await Promise.all(
      defaultServers.map(async (s) => {
        if (!s.config_schema) return;
        const defaultConfigEntries = getEntries(s.config_schema)
          .map(([key, schema]) => {
            if (schema.type === "local" && schema.defaultValue !== undefined) {
              return [key, schema.defaultValue] as const;
            }
          })
          .filter(isDefined);

        if (
          defaultConfigEntries.length &&
          !(await dbs.mcp_server_configs.findOne({ server_name: s.name }))
        ) {
          const defaultConfig = Object.fromEntries(defaultConfigEntries);
          return {
            server_name: s.name,
            config: defaultConfig,
          };
        }
      }),
    )
  ).filter(isDefined);

  if (defaultConfigs.length) {
    await dbs.mcp_server_configs.insertMany(defaultConfigs);
  }
};
