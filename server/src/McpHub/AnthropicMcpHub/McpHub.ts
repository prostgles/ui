import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { type CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { isEqual } from "prostgles-types";
import {
  connectToMCPServer,
  type MCPServerInitInfo,
} from "./connectToMCPServer";
import type { createMcpServerHandlers } from "./createMcpServerHandlers";
import { McpServer, ServersConfig } from "./McpTypes";

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

  private async connectToServer(initInfo: MCPServerInitInfo) {
    const { name } = initInfo;
    const instance = await connectToMCPServer(initInfo);
    if (instance.success) {
      this.connections.set(name, instance.connection);
    } else {
      this.connections.delete(name);
    }
    return instance;
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
        const eventOptions = {
          onLog,
          onTransportClose: () => {},
        };
        const instance = await this.connectToServer({
          name,
          parameters,
          server_name: otherParams.server_name,
          ...eventOptions,
        });
        if (!instance.success) {
          void onLog({ type: "error", data: instance.error }, instance.log);
        }
      }
    }
    this.isConnecting = false;
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

    return connection.handlers.callTool(toolName, toolArguments);
  }

  async destroy(): Promise<void> {
    console.log(
      "MCP Hub destroying all connections: ",
      Array.from(this.connections.keys()),
    );
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
