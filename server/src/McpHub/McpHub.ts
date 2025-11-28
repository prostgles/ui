import { McpToolCallResponse } from "@common/mcp";
import { DBSSchema } from "@common/publishUtils";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import {
  StdioClientTransport,
  StdioServerParameters,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  CallToolResultSchema,
  ReadResourceResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as path from "path";
import {
  getSerialisableError,
  isEqual,
  SubscriptionHandler,
  tryCatchV2,
} from "prostgles-types";
import { DBS } from "..";
import { getDockerMCPToolSchemas } from "../DockerManager/getDockerMCP";
import { checkMCPServerTools } from "./checkMCPServerTools";
import { connectToMCPServer } from "./connectToMCPServer";
import { DefaultMCPServers } from "./DefaultMCPServers/DefaultMCPServers";
import { fetchMCPResourcesList } from "./fetchMCPResourcesList";
import { fetchMCPResourceTemplatesList } from "./fetchMCPResourceTemplatesList";
import { fetchMCPServerConfigs } from "./fetchMCPServerConfigs";
import { fetchMCPToolsList } from "./fetchMCPToolsList";
import { getMCPDirectory } from "./installMCPServer";
import {
  McpResourceResponse,
  McpServer,
  McpServerEvents,
  ServersConfig,
} from "./McpTypes";
import { updateMcpServerTools } from "./reloadMcpServerTools";

export type McpConnection = {
  server: McpServer;
  client: Client;
  transport:
    | StdioClientTransport
    | SSEClientTransport
    | StreamableHTTPClientTransport;
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
    delete this.connections[name];
    const { data: connection, error } = await tryCatchV2(
      async () => await connectToMCPServer(name, config, evs),
    );
    if (connection) {
      connection.server.tools = await fetchMCPToolsList(connection.client);
      connection.server.resources = await fetchMCPResourcesList(
        connection.client,
      );
      connection.server.resourceTemplates = await fetchMCPResourceTemplatesList(
        connection.client,
      );
      this.connections[name] = connection;
    } else {
      delete this.connections[name];
      throw error;
    }
  }

  private async destroyConnection(name: string): Promise<void> {
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
          void onLog("error", JSON.stringify(getSerialisableError(error)), "");
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

let mcpHubInitPromise: Promise<McpHub> | undefined;
export const startMcpHub = async (
  dbs: DBS,
  restart = false,
): Promise<McpHub> => {
  if (mcpHubInitPromise) {
    await mcpHubInitPromise;
    if (!restart) return mcpHubInitPromise;
    return startMcpHub(dbs, restart);
  }

  mcpHubInitPromise = (async () => {
    if (restart) {
      await mcpHub.destroy();
    }
    const serversConfig = await fetchMCPServerConfigs(dbs);
    await mcpHub.setServerConnections(serversConfig);
    await checkMCPServerTools(mcpHub);
    const serverNames = Object.keys(mcpHub.connections);
    if (serverNames.length) {
      console.log(
        `McpHub started. Enabled servers (${serverNames.length}): ${serverNames.join()}`,
      );
    }
    for (const [server_name] of Object.entries(serversConfig)) {
      const client = mcpHub.connections[server_name]?.client;
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
  // mcpHubInitializing = false;
  // if (mcpHubReInitializingRequested) {
  //   mcpHubReInitializingRequested = false;
  //   void startMcpHub(dbs);
  // }
  // if (result.hasError) {
  //   throw result.error;
  // }
  // return result.data;
};

const mcpSubscriptions: Record<string, SubscriptionHandler | undefined> = {
  globalSettings: undefined,
  servers: undefined,
};

export const setupMCPServerHub = async (dbs: DBS) => {
  const servers = await dbs.mcp_servers.find();
  if (!servers.length) {
    const dockerMCPTools = await getDockerMCPToolSchemas(dbs, undefined);
    const defaultServers = Object.entries(DefaultMCPServers).map(
      ([name, { mcp_server_tools = [], ...server }]) => {
        return {
          name,
          cwd:
            server.source ?
              path.join(getMCPDirectory(), name)
            : getMCPDirectory(),
          ...server,
          mcp_server_tools:
            name === "docker-sandbox" ? dockerMCPTools : mcp_server_tools,
        };
      },
    );
    await dbs.mcp_servers.insert(defaultServers);
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
