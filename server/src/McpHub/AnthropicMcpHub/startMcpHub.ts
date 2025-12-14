import type { DBS } from "@src/index";
import { McpHub } from "./McpHub";
import { fetchMCPServerConfigs } from "../fetchMCPServerConfigs";
import { updateMcpServerTools } from "../reloadMcpServerTools";
import type { SubscriptionHandler } from "prostgles-types";
import { insertServerList } from "../insertServerList";

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
    for (const server_name of serverNames) {
      const client = mcpHub.getClient(server_name); // mcpHub.connections[server_name]?.client;
      if (client) {
        const toolCount = await dbs.mcp_server_tools.count({
          server_name,
        });
        if (!toolCount) {
          await updateMcpServerTools(dbs, server_name, client);
        }
      }
    }
    return mcpHub;
  })();

  return mcpHubInitPromise;
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

  let serversCallbackCount = 0;
  let globalSettingsCallbackCount = 0;
  const onCallback = (subName: "server" | "globalSettings") => {
    if (subName === "server") {
      serversCallbackCount++;
    } else {
      globalSettingsCallbackCount++;
    }
    if (serversCallbackCount && globalSettingsCallbackCount) {
      void startMcpHub(dbs, true);
    }
  };

  mcpSubscriptions.servers = await dbs.mcp_servers.subscribe(
    { enabled: true },
    { select: { "*": 1, mcp_server_configs: "*" }, limit: 0 },
    () => {
      onCallback("server");
    },
  );
  mcpSubscriptions.globalSettings = await dbs.global_settings.subscribeOne(
    {},
    { limit: 0 },
    () => {
      onCallback("globalSettings");
    },
  );
};
