import { McpToolCallResponse } from "@common/mcp";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  CallToolResultSchema,
  ReadResourceResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getSerialisableError, isEqual, tryCatchV2 } from "prostgles-types";
import {
  connectToMCPServer,
  type MCPServerInitInfo,
} from "./connectToMCPServer";
import { fetchMCPResourcesList } from "./fetchMCPResourcesList";
import { fetchMCPResourceTemplatesList } from "./fetchMCPResourceTemplatesList";
import { fetchMCPToolsList } from "./fetchMCPToolsList";
import { McpResourceResponse, McpServer, ServersConfig } from "./McpTypes";

export type McpConnection = {
  /**
   * Actual MCP server name.
   * server.name is concatenated with config id instance
   */
  server_name: string;
  server: McpServer;
  client: Client;
  transport: StdioClientTransport | StreamableHTTPClientTransport;
  destroy: () => Promise<void>;
};

export class McpHub {
  connections: Record<string, McpConnection> = {};
  isConnecting = false;

  constructor() {}

  getClient = (serverName: string): Client | undefined => {
    return Object.values(this.connections).find(
      (conn) => conn.server_name === serverName,
    )?.client;
  };

  getServers(): McpServer[] {
    // Only return enabled servers
    return Object.values(this.connections)
      .filter((conn) => !conn.server.disabled)
      .map((conn) => conn.server);
  }

  private async connectToServer(initInfo: MCPServerInitInfo): Promise<void> {
    const { name } = initInfo;
    delete this.connections[name];
    const { data: connection, error } = await tryCatchV2(
      async () => await connectToMCPServer(initInfo),
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
          await this.connectToServer({
            name,
            config,
            server_name: config.server_name,
            ...eventOptions,
          });
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
