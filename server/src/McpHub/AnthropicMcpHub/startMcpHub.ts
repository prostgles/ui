import type { DBS } from "@src/index";
import { McpHub } from "./McpHub";
import { fetchMCPServerConfigs } from "../fetchMCPServerConfigs";
import { updateMcpServerTools } from "../reloadMcpServerTools";
import type { SubscriptionHandler } from "prostgles-types";
import { insertServerList } from "../insertServerList";
import type { DBSSchema } from "@common/publishUtils";

const mcpHub = new McpHub();

let mcpHubInitPromise: Promise<McpHub> | undefined;
export const startMcpHub = async (
  dbs: DBS,
  restart = false,
): Promise<McpHub> => {
  if (mcpHubInitPromise) {
    await mcpHubInitPromise;
    if (!restart) {
      const res = await mcpHubInitPromise;
      return res;
    } else {
      mcpHubInitPromise = undefined;
    }
  }

  mcpHubInitPromise = (async () => {
    if (restart) {
      await mcpHub.destroy();
    }
    const serversConfig = await fetchMCPServerConfigs(dbs);
    const serverNames = Array.from(
      new Set(Object.values(serversConfig).map((s) => s.server_name)),
    );
    await mcpHub.setServerConnections(serversConfig);
    if (serverNames.length) {
      const serverNamesWithConfig = Object.keys(serversConfig);
      console.log(
        `McpHub started. Enabled servers (${serverNamesWithConfig.length}): ${serverNamesWithConfig.join()}`,
      );
    }
    return mcpHub;
  })();

  return mcpHubInitPromise;
};

const loadMissingTools = async (
  dbs: DBS,
  mcpHub: McpHub,
  enabledMcpServers: DBSSchema["mcp_servers"][],
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
  await insertServerList(dbs);
  for (const sub of Object.values(mcpSubscriptions)) {
    await sub?.unsubscribe();
  }

  let enabledMcpServers: DBSSchema["mcp_servers"][] | undefined;
  let globalSettings: DBSSchema["global_settings"] | undefined;
  const onCallback = () => {
    if (enabledMcpServers && globalSettings) {
      void startMcpHub(dbs, true).then(async (mcpHub) => {
        if (!enabledMcpServers) {
          throw new Error("enabledMcpServers is undefined");
        }
        await loadMissingTools(dbs, mcpHub, enabledMcpServers);
      });
    }
  };

  mcpSubscriptions.servers = await dbs.mcp_servers.subscribe(
    { enabled: true },
    { select: { "*": 1, mcp_server_configs: "*" } },
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
