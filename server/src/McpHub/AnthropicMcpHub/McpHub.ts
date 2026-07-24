import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  CallToolResultSchema,
  ListPromptsResultSchema,
  ReadResourceResultSchema,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { getSerialisableError, isEqual, tryCatchV2 } from "prostgles-types";
import {
  connectToMCPServer,
  type MCPServerInitInfo,
} from "./connectToMCPServer";
import type { createMcpServerHandlers } from "./createMcpServerHandlers";
import { McpResourceResponse, McpServer, ServersConfig } from "./McpTypes";

export type McpConnection = {
  /**
   * Actual MCP server name.
   * server.name is concatenated with config id instance
   */
  server_name: string;
  server: McpServer;
  client: Client;
  handlers: ReturnType<typeof createMcpServerHandlers>;
  transport: StdioClientTransport | StreamableHTTPClientTransport;
  destroy: () => Promise<void>;
};

export class McpHub {
  connections = new Map<string, McpConnection>();
  isConnecting = false;

  constructor() {}

  getServer = (serverName: string) => {
    return Array.from(this.connections.values()).find(
      (conn) => conn.server_name === serverName,
    );
  };
  getClientHandlers = (serverName: string) => {
    return this.getServer(serverName)?.handlers;
  };

  getServers(): McpServer[] {
    return Array.from(this.connections.values()).map((conn) => conn.server);
  }

  private async connectToServer(initInfo: MCPServerInitInfo): Promise<void> {
    const { name } = initInfo;
    const { data: connection, error } = await tryCatchV2(
      async () => await connectToMCPServer(initInfo),
    );
    if (connection) {
      // connection.server.tools = await fetchMCPToolsList(connection.client);
      // connection.server.resources = await fetchMCPResourcesList(
      //   connection.client,
      // );
      // connection.server.resourceTemplates = await fetchMCPResourceTemplatesList(
      //   connection.client,
      // );
      // connection.server.prompts = await fetchPrompts(connection.client);
      this.connections.set(name, connection);
    } else {
      this.connections.delete(name);
      throw error;
    }
  }

  private async destroyConnection(name: string): Promise<void> {
    const connection = this.connections.get(name);
    if (connection) {
      this.connections.delete(name);
      await connection.destroy();
    }
  }

  async setServerConnections(serversConfig: ServersConfig): Promise<void> {
    this.isConnecting = true;
    const currentNames = Array.from(this.connections.keys());
    const newNames = new Set(Array.from(serversConfig.keys()));

    // Delete removed servers
    for (const name of currentNames) {
      if (!newNames.has(name)) {
        await this.destroyConnection(name);
        console.log(`Destroyed MCP server: ${name}`);
      }
    }

    // Update or add servers
    for (const [name, parameters] of Array.from(serversConfig.entries())) {
      const { onLog, ...otherParams } = parameters;
      const currentConnection = this.connections.get(name);
      const isRunningDifferentConfig =
        currentConnection &&
        !isEqual(currentConnection.server.config, otherParams);
      if (isRunningDifferentConfig) {
        await this.destroyConnection(name);
      }

      if (!currentConnection || isRunningDifferentConfig) {
        try {
          const eventOptions = {
            onLog,
            onTransportClose: () => {
              this.connections.delete(name);
            },
          };
          await this.connectToServer({
            name,
            parameters,
            server_name: otherParams.server_name,
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
    const connection = this.connections.get(serverName);
    if (!connection) {
      throw new Error(
        `No connection found for MCP server: ${serverName}. Make sure it is enabled`,
      );
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
    serverInstanceName: string,
    toolName: string,
    toolArguments?: Record<string, unknown>,
  ): Promise<McpToolCallResponse> {
    const connection = this.connections.get(serverInstanceName);
    if (!connection) {
      throw new Error(
        `No connection found for MCP server: ${serverInstanceName}. Please make sure it is enabled`,
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

  async getPrompts(serverInstanceName: string) {
    const connection = this.connections.get(serverInstanceName);
    if (!connection) {
      throw new Error(
        `No connection found for MCP server: ${serverInstanceName}. Please make sure it is enabled`,
      );
    }

    const prompts = await connection.client.request(
      {
        method: "prompts/list",
      },
      ListPromptsResultSchema,
    );
    return prompts;
  }

  async destroy(): Promise<void> {
    for (const connection of this.connections.values()) {
      try {
        await this.destroyConnection(connection.server.name);
      } catch (error) {
        console.error(
          `Failed to close connection for ${connection.server.name}:`,
          error,
        );
      }
    }
    this.connections = new Map();
  }
}

export type McpToolCallResponse = Pick<
  CallToolResult,
  "content" | "isError"
> & {
  structuredContent?: unknown;
};
