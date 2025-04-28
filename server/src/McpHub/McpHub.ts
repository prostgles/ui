/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StdioClientTransport,
  StdioServerParameters,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  CallToolResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  ListToolsResultSchema,
  ReadResourceResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { isEqual, SubscriptionHandler, tryCatchV2 } from "prostgles-types";
import { DBS } from "..";
import {
  DefaultMCPServers,
  McpToolCallResponse,
} from "../../../commonTypes/mcp";
import { DBSSchema } from "../../../commonTypes/publishUtils";
import { connectToMCPServer } from "./connectToMCPServer";
import { fetchMCPServerConfigs } from "./fetchMCPServerConfigs";
import { getMCPDirectory } from "./installMCPServer";
import {
  McpResource,
  McpResourceResponse,
  McpResourceTemplate,
  McpServer,
  McpServerEvents,
  McpTool,
  ServersConfig,
} from "./McpTypes";
import { checkMCPServerTools } from "./checkMCPServerTools";
import { getErrorAsObject } from "prostgles-server/dist/DboBuilder/dboBuilderUtils";

export type McpConnection = {
  server: McpServer;
  client: Client;
  transport: StdioClientTransport;
  destroy: () => Promise<void>;
};

export class McpHub {
  connections: Record<string, McpConnection> = {};
  isConnecting = false;

  constructor() {}

  getServers(): McpServer[] {
    // Only return enabled servers
    return Object.values(this.connections)
      .filter((conn) => !conn.server.disabled)
      .map((conn) => conn.server);
  }

  private async connectToServer(
    name: string,
    config: StdioServerParameters,
    evs: McpServerEvents,
  ): Promise<void> {
    // Remove existing connection if it exists (should never happen, the connection should be deleted beforehand)
    delete this.connections[name];
    const { data: connection, error } = await tryCatchV2(
      async () => await connectToMCPServer(name, config, evs),
    );
    if (connection) {
      // Initial fetch of tools and resources
      connection.server.tools = await this.fetchToolsList(name);
      connection.server.resources = await this.fetchResourcesList(name);
      connection.server.resourceTemplates =
        await this.fetchResourceTemplatesList(name);
      this.connections[name] = connection;
    } else {
      delete this.connections[name];
      throw error;
    }
  }

  async fetchToolsList(serverName: string): Promise<McpTool[]> {
    try {
      const response = await this.connections[serverName]?.client.request(
        { method: "tools/list" },
        ListToolsResultSchema,
      );

      const autoApproveConfig: string[] = [];
      const tools = (response?.tools || []).map((tool) => ({
        ...tool,
        description: tool.description ?? "",
        autoApprove: autoApproveConfig.includes(tool.name),
      }));
      return tools;
    } catch (error) {
      return [];
    }
  }

  private async fetchResourcesList(serverName: string): Promise<McpResource[]> {
    try {
      const response = await this.connections[serverName]?.client.request(
        { method: "resources/list" },
        ListResourcesResultSchema,
      );
      return response?.resources || [];
    } catch (error) {
      return [];
    }
  }

  private async fetchResourceTemplatesList(
    serverName: string,
  ): Promise<McpResourceTemplate[]> {
    try {
      const response = await this.connections[serverName]?.client.request(
        { method: "resources/templates/list" },
        ListResourceTemplatesResultSchema,
      );
      return response?.resourceTemplates || [];
    } catch (error) {
      return [];
    }
  }

  async destroyConnection(name: string): Promise<void> {
    const connection = this.connections[name];
    if (connection) {
      delete this.connections[name];
      await connection.destroy();
    }
  }

  async setServerConnections(serversConfig: ServersConfig): Promise<void> {
    this.isConnecting = true;
    const currentNames = Object.keys(this.connections);
    const newNames = new Set(Object.keys(serversConfig));

    // Delete removed servers
    for (const name of currentNames) {
      if (!newNames.has(name)) {
        await this.destroyConnection(name);
        console.log(`Destroyed MCP server: ${name}`);
      }
    }

    // Update or add servers
    for (const [name, { onLog, ...config }] of Object.entries(serversConfig)) {
      const currentConnection = this.connections[name];
      const isRunningDifferentConfig =
        currentConnection && !isEqual(currentConnection.server.config, config);
      if (isRunningDifferentConfig) {
        await this.destroyConnection(name);
      }

      if (!currentConnection || isRunningDifferentConfig) {
        try {
          const eventOptions = {
            onLog,
            onTransportClose: () => {
              delete this.connections[name];
            },
          };
          await this.connectToServer(name, config, eventOptions);
        } catch (error) {
          void onLog("error", JSON.stringify(getErrorAsObject(error)), "");
          if (isRunningDifferentConfig) {
            console.error(
              `Failed to connect to new MCP server ${name}:`,
              error,
            );
          } else {
            console.error(`Failed to reconnect MCP server ${name}:`, error);
          }
        }
      }
    }
    this.isConnecting = false;
  }

  async readResource(
    serverName: string,
    uri: string,
  ): Promise<McpResourceResponse> {
    const connection = this.connections[serverName];
    if (!connection) {
      throw new Error(
        `No connection found for MCP server: ${serverName}. Make sure it is enabled`,
      );
    }
    if (connection.server.disabled) {
      throw new Error(`Server "${serverName}" is disabled`);
    }
    return await connection.client.request(
      {
        method: "resources/read",
        params: {
          uri,
        },
      },
      ReadResourceResultSchema,
    );
  }

  async callTool(
    serverName: string,
    toolName: string,
    toolArguments?: Record<string, unknown>,
  ): Promise<McpToolCallResponse> {
    const connection = this.connections[serverName];
    if (!connection) {
      throw new Error(
        `No connection found for MCP server: ${serverName}. Please make sure it is enabled`,
      );
    }

    if (connection.server.disabled) {
      throw new Error(
        `MCP Server "${serverName}" is disabled and cannot be used`,
      );
    }

    const toolResult = await connection.client.request(
      {
        method: "tools/call",
        params: {
          name: toolName,
          arguments: toolArguments,
        },
      },
      CallToolResultSchema,
    );
    return toolResult;
  }

  async destroy(): Promise<void> {
    for (const connection of Object.values(this.connections)) {
      try {
        await this.destroyConnection(connection.server.name);
      } catch (error) {
        console.error(
          `Failed to close connection for ${connection.server.name}:`,
          error,
        );
      }
    }
    this.connections = {};
  }
}

const mcpHub = new McpHub();

let mcpHubInitializing = false;
let mcpHubReInitializingRequested = false;
export const startMcpHub = async (
  dbs: DBS,
  restart = false,
): Promise<McpHub> => {
  mcpHubReInitializingRequested = mcpHubInitializing;
  mcpHubInitializing = true;
  const result = await tryCatchV2(async () => {
    if (restart) await mcpHub.destroy();
    const serversConfig = await fetchMCPServerConfigs(dbs);
    await mcpHub.setServerConnections(serversConfig);
    await checkMCPServerTools(mcpHub);
    const serverNames = Object.keys(mcpHub.connections);
    if (serverNames.length) {
      console.log(`McpHub started with ${serverNames.length} enabled servers`);
    }
    return mcpHub;
  });
  mcpHubInitializing = false;
  if (mcpHubReInitializingRequested) {
    mcpHubReInitializingRequested = false;
    void startMcpHub(dbs);
  }
  if (result.hasError) {
    throw result.error;
  }
  return result.data;
};

export const reloadMcpServerTools = async (dbs: DBS, serverName: string) => {
  await startMcpHub(dbs);
  const tools = await mcpHub.fetchToolsList(serverName);
  await dbs.tx(async (tx) => {
    await tx.mcp_server_tools.delete({ server_name: serverName });
    tools.length &&
      (await tx.mcp_server_tools.insert(
        tools.map((tool) => ({
          ...tool,
          description: tool.description ?? "",
          server_name: serverName,
        })),
      ));
  });
  return tools.length;
};

const mcpSubscriptions: Record<string, SubscriptionHandler | undefined> = {
  globalSettings: undefined,
  servers: undefined,
};

export const setupMCPServerHub = async (dbs: DBS) => {
  const servers = await dbs.mcp_servers.find();
  if (!servers.length) {
    await dbs.mcp_servers.insert(
      Object.entries(DefaultMCPServers).map(([name, server]) => ({
        name,
        cwd: getMCPDirectory(),
        ...server,
      })),
    );
  }
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
      void startMcpHub(dbs);
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

export const testMCPServerConfig = async (
  dbs: DBS,
  config: DBSSchema["mcp_server_configs"],
) => {
  const mcpConfig = await fetchMCPServerConfigs(dbs, config);
  return (
    await connectToMCPServer(
      config.server_name,
      mcpConfig[config.server_name]!,
      { onLog: () => {}, onTransportClose: () => {} },
    )
  ).destroy();
};
