import type { DBS } from "@src/index";
import { McpHub } from "./McpHub";
import { fetchMCPServerConfigs } from "../fetchMCPServerConfigs";
import { updateMcpServerTools } from "../reloadMcpServerTools";
import {
  getSerialisableError,
  type SubscriptionHandler,
} from "prostgles-types";
import { insertMcpServerList } from "../insertMcpServerList";
import type { DBSSchema } from "@common/publishUtils";

const mcpHub = new McpHub();

let mcpHubInitPromise: Promise<McpHub> | undefined;
export const startMcpHub = (dbs: DBS, restart = false): Promise<McpHub> => {
  const result = (async () => {
    if (!restart && mcpHubInitPromise) {
      const res = await mcpHubInitPromise;
      return res;
    }

    await mcpHubInitPromise?.catch((err) => {
      console.error("Error starting MCP Hub", err);
    });

    await mcpHub.destroy().catch((err) => {
      console.error("Error destroying MCP Hub", err);
    });

    const serversConfig = await fetchMCPServerConfigs(dbs);
    const serverNames = Array.from(
      new Set(Array.from(serversConfig.values()).map((s) => s.server_name)),
    );
    await mcpHub.setServerConnections(serversConfig);
    if (serverNames.length) {
      const serverNamesWithConfig = Array.from(serversConfig.keys());
      console.log(
        `McpHub started. Enabled servers (${serverNamesWithConfig.length}): ${serverNamesWithConfig.join()}`,
      );
    }
    return mcpHub;
  })();

  mcpHubInitPromise = result;

  return result;
};

type EnabledMcpServer = Pick<DBSSchema["mcp_servers"], "name" | "enabled"> & {
  mcp_server_configs: Pick<
    DBSSchema["mcp_server_configs"],
    "server_name" | "config"
  >[];
};

const loadMissingTools = async (
  dbs: DBS,
  mcpHub: McpHub,
  enabledMcpServers: EnabledMcpServer[],
) => {
  for (const { name: server_name } of enabledMcpServers) {
    const toolCount = await dbs.mcp_server_tools.count({
      server_name,
    });
    if (!toolCount) {
      await updateMcpServerTools(dbs, server_name, mcpHub);
    }
  }
};

const mcpSubscriptions: Record<string, SubscriptionHandler | undefined> = {
  globalSettings: undefined,
  servers: undefined,
};

export const setupMCPServerHub = async (dbs: DBS) => {
  await insertMcpServerList(dbs);
  for (const sub of Object.values(mcpSubscriptions)) {
    await sub?.unsubscribe();
  }

  let enabledMcpServers: EnabledMcpServer[] | undefined;
  let globalSettings: DBSSchema["global_settings"] | undefined;
  const onCallback = () => {
    if (enabledMcpServers && globalSettings) {
      void startMcpHub(dbs, true).then(async (mcpHub) => {
        if (!enabledMcpServers) {
          throw new Error("enabledMcpServers is undefined");
        }
        await loadMissingTools(dbs, mcpHub, enabledMcpServers).catch((err) => {
          void dbs.alerts.insert({
            severity: "error",
            title: "MCP Server Hub Tool Load Error",
            message: JSON.stringify(getSerialisableError(err)),
            ui_path: {
              page: "/server-settings",
              section: "mcpServers",
            },
          });
          console.error("Error loading MCP server tools", err);
        });
      });
    }
  };

  mcpSubscriptions.servers = await dbs.mcp_servers.subscribe(
    { enabled: true },
    { select: { name: 1, enabled: 1, mcp_server_configs: "*" } },
    (servers) => {
      enabledMcpServers = servers;
      onCallback();
    },
  );
  mcpSubscriptions.globalSettings = await dbs.global_settings.subscribeOne(
    {},
    { limit: 1 },
    (settings) => {
      globalSettings = settings;
      onCallback();
    },
  );
};
