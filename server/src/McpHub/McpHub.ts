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
import { isDefined, isEqual, pickKeys } from "prostgles-types";
import { z } from "zod";
import { DBS, tout } from "..";
import {
  McpResource,
  McpResourceResponse,
  McpResourceTemplate,
  McpServer,
  McpTool,
  McpToolCallResponse,
  ServersConfig,
} from "./McpTypes";
import { DBSSchema } from "../../../commonTypes/publishUtils";
import e from "express";

export type McpConnection = {
  server: McpServer;
  client: Client;
  transport: StdioClientTransport;
};

const AutoApproveSchema = z.array(z.string()).default([]);

const StdioConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  autoApprove: AutoApproveSchema.optional(),
  disabled: z.boolean().optional(),
});

export class McpHub {
  connections: McpConnection[] = [];
  isConnecting = false;

  constructor() {
    // this.providerRef = provider;
    // this.watchMcpSettingsFile();
  }

  getServers(): McpServer[] {
    // Only return enabled servers
    return this.connections
      .filter((conn) => !conn.server.disabled)
      .map((conn) => conn.server);
  }

  private async connectToServer(
    name: string,
    config: StdioServerParameters,
  ): Promise<void> {
    // Remove existing connection if it exists (should never happen, the connection should be deleted beforehand)
    this.connections = this.connections.filter(
      (conn) => conn.server.name !== name,
    );

    try {
      // Each MCP server requires its own transport connection and has unique capabilities, configurations, and error handling.
      // Having separate clients also allows proper scoping of resources/tools and independent server management like reconnection.
      const client = new Client(
        {
          name: "Prostgles",
          version: "1.0.0",
        },
        {
          capabilities: {},
        },
      );

      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: {
          ...config.env,
          ...(process.env.PATH ? { PATH: process.env.PATH } : {}),
          // ...(process.env.NODE_PATH ? { NODE_PATH: process.env.NODE_PATH } : {}),
        },
        stderr: "pipe", // necessary for stderr to be available
      });

      transport.onerror = async (error) => {
        console.error(`Transport error for "${name}":`, error);
        const connection = this.connections.find(
          (conn) => conn.server.name === name,
        );
        if (connection) {
          connection.server.status = "disconnected";
          this.appendErrorMessage(connection, error.message);
        }
        // await this.notifyWebviewOfServerChanges();
      };

      transport.onclose = async () => {
        const connection = this.connections.find(
          (conn) => conn.server.name === name,
        );
        if (connection) {
          connection.server.status = "disconnected";
        }
        // await this.notifyWebviewOfServerChanges();
      };

      // If the config is invalid, show an error
      if (!StdioConfigSchema.safeParse(config).success) {
        console.error(
          `Invalid config for "${name}": missing or invalid parameters`,
        );
        const connection: McpConnection = {
          server: {
            name,
            config: JSON.stringify(config),
            status: "disconnected",
            error: "Invalid config: missing or invalid parameters",
          },
          client,
          transport,
        };
        this.connections.push(connection);
        return;
      }

      // valid schema
      const parsedConfig = StdioConfigSchema.parse(config);
      const connection: McpConnection = {
        server: {
          name,
          config: JSON.stringify(config),
          status: "connecting",
          disabled: parsedConfig.disabled,
        },
        client,
        transport,
      };
      this.connections.push(connection);

      // transport.stderr is only available after the process has been started. However we can't start it separately from the .connect() call because it also starts the transport. And we can't place this after the connect call since we need to capture the stderr stream before the connection is established, in order to capture errors during the connection process.
      // As a workaround, we start the transport ourselves, and then monkey-patch the start method to no-op so that .connect() doesn't try to start it again.
      await transport.start();
      const stderrStream = transport.stderr;
      if (stderrStream) {
        stderrStream.on("data", async (data: Buffer) => {
          const errorOutput = data.toString();
          console.error(`Server "${name}" stderr:`, errorOutput);
          const connection = this.connections.find(
            (conn) => conn.server.name === name,
          );
          if (connection) {
            // NOTE: we do not set server status to "disconnected" because stderr logs do not necessarily mean the server crashed or disconnected, it could just be informational. In fact when the server first starts up, it immediately logs "<name> server running on stdio" to stderr.
            this.appendErrorMessage(connection, errorOutput);
            // Only need to update webview right away if it's already disconnected
            if (connection.server.status === "disconnected") {
              // await this.notifyWebviewOfServerChanges();
            }
          }
        });
      } else {
        console.error(`No stderr stream for ${name}`);
      }
      transport.start = async () => {}; // No-op now, .connect() won't fail

      // // Set up notification handlers
      // client.setNotificationHandler(
      // 	// @ts-ignore-next-line
      // 	{ method: "notifications/tools/list_changed" },
      // 	async () => {
      // 		console.log(`Tools changed for server: ${name}`)
      // 		connection.server.tools = await this.fetchTools(name)
      // 		await this.notifyWebviewOfServerChanges()
      // 	},
      // )

      // client.setNotificationHandler(
      // 	// @ts-ignore-next-line
      // 	{ method: "notifications/resources/list_changed" },
      // 	async () => {
      // 		console.log(`Resources changed for server: ${name}`)
      // 		connection.server.resources = await this.fetchResources(name)
      // 		connection.server.resourceTemplates = await this.fetchResourceTemplates(name)
      // 		await this.notifyWebviewOfServerChanges()
      // 	},
      // )

      // Connect
      await client.connect(transport);
      connection.server.status = "connected";
      connection.server.error = "";

      // Initial fetch of tools and resources
      connection.server.tools = await this.fetchToolsList(name);
      connection.server.resources = await this.fetchResourcesList(name);
      connection.server.resourceTemplates =
        await this.fetchResourceTemplatesList(name);
    } catch (error) {
      // Update status with error
      const connection = this.connections.find(
        (conn) => conn.server.name === name,
      );
      if (connection) {
        connection.server.status = "disconnected";
        this.appendErrorMessage(
          connection,
          error instanceof Error ? error.message : String(error),
        );
      }
      throw error;
    }
  }

  private appendErrorMessage(connection: McpConnection, error: string) {
    const newError =
      connection.server.error ? `${connection.server.error}\n${error}` : error;
    connection.server.error = newError; //.slice(0, 800)
  }

  private async fetchToolsList(serverName: string): Promise<McpTool[]> {
    try {
      const response = await this.connections
        .find((conn) => conn.server.name === serverName)
        ?.client.request({ method: "tools/list" }, ListToolsResultSchema);

      // Get autoApprove settings
      // const settingsPath = await this.getMcpSettingsFilePath();
      // const content = await fs.readFile(settingsPath, "utf-8");
      // const config = JSON.parse(content);
      const autoApproveConfig: string[] = [];
      // config.mcpServers[serverName]?.autoApprove || [];

      // Mark tools as always allowed based on settings
      const tools = (response?.tools || []).map((tool) => ({
        ...tool,
        autoApprove: autoApproveConfig.includes(tool.name),
      }));

      // console.log(`[MCP] Fetched tools for ${serverName}:`, tools)
      return tools;
    } catch (error) {
      // console.error(`Failed to fetch tools for ${serverName}:`, error)
      return [];
    }
  }

  private async fetchResourcesList(serverName: string): Promise<McpResource[]> {
    try {
      const response = await this.connections
        .find((conn) => conn.server.name === serverName)
        ?.client.request(
          { method: "resources/list" },
          ListResourcesResultSchema,
        );
      return response?.resources || [];
    } catch (error) {
      // console.error(`Failed to fetch resources for ${serverName}:`, error)
      return [];
    }
  }

  private async fetchResourceTemplatesList(
    serverName: string,
  ): Promise<McpResourceTemplate[]> {
    try {
      const response = await this.connections
        .find((conn) => conn.server.name === serverName)
        ?.client.request(
          { method: "resources/templates/list" },
          ListResourceTemplatesResultSchema,
        );
      return response?.resourceTemplates || [];
    } catch (error) {
      // console.error(`Failed to fetch resource templates for ${serverName}:`, error)
      return [];
    }
  }

  async deleteConnection(name: string): Promise<void> {
    const connection = this.connections.find(
      (conn) => conn.server.name === name,
    );
    if (connection) {
      try {
        // connection.client.removeNotificationHandler("notifications/tools/list_changed")
        // connection.client.removeNotificationHandler("notifications/resources/list_changed")
        // connection.client.removeNotificationHandler("notifications/stderr")
        // connection.client.removeNotificationHandler("notifications/stderr")
        await connection.transport.close();
        await connection.client.close();
      } catch (error) {
        console.error(`Failed to close transport for ${name}:`, error);
      }
      this.connections = this.connections.filter(
        (conn) => conn.server.name !== name,
      );
    }
  }

  async setServerConnections(serversConfig: ServersConfig): Promise<void> {
    this.isConnecting = true;
    // this.removeAllFileWatchers();
    const currentNames = new Set(
      this.connections.map((conn) => conn.server.name),
    );
    const newNames = new Set(Object.keys(serversConfig));

    // Delete removed servers
    for (const name of currentNames) {
      if (!newNames.has(name)) {
        await this.deleteConnection(name);
        console.log(`Deleted MCP server: ${name}`);
      }
    }

    // Update or add servers
    for (const [name, config] of Object.entries(serversConfig)) {
      const currentConnection = this.connections.find(
        (conn) => conn.server.name === name,
      );

      if (!currentConnection) {
        // New server
        try {
          // this.setupFileWatcher(name, config);
          await this.connectToServer(name, config);
        } catch (error) {
          console.error(`Failed to connect to new MCP server ${name}:`, error);
        }
      } else if (
        !isEqual(JSON.parse(currentConnection.server.config), config)
      ) {
        // Existing server with changed config
        try {
          // this.setupFileWatcher(name, config);
          await this.deleteConnection(name);
          await this.connectToServer(name, config);
          console.log(`Reconnected MCP server with updated config: ${name}`);
        } catch (error) {
          console.error(`Failed to reconnect MCP server ${name}:`, error);
        }
      }
      // If server exists with same config, do nothing
    }
    // await this.notifyWebviewOfServerChanges();
    this.isConnecting = false;
  }

  async restartConnection(serverName: string): Promise<void> {
    this.isConnecting = true;

    // Get existing connection and update its status
    const connection = this.connections.find(
      (conn) => conn.server.name === serverName,
    );
    const config = connection?.server.config;
    if (config) {
      connection.server.status = "connecting";
      connection.server.error = "";
      await tout(500); // artificial delay to show user that server is restarting
      try {
        await this.deleteConnection(serverName);
        // Try to connect again using existing config
        await this.connectToServer(serverName, JSON.parse(config));
      } catch (error) {
        console.error(`Failed to restart connection for ${serverName}:`, error);
      }
    }

    this.isConnecting = false;
  }

  async readResource(
    serverName: string,
    uri: string,
  ): Promise<McpResourceResponse> {
    const connection = this.connections.find(
      (conn) => conn.server.name === serverName,
    );
    if (!connection) {
      throw new Error(`No connection found for server: ${serverName}`);
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
    const connection = this.connections.find(
      (conn) => conn.server.name === serverName,
    );
    if (!connection) {
      throw new Error(
        `No connection found for server: ${serverName}. Please make sure to use MCP servers available under 'Connected MCP Servers'.`,
      );
    }

    if (connection.server.disabled) {
      throw new Error(`Server "${serverName}" is disabled and cannot be used`);
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

  async dispose(): Promise<void> {
    for (const connection of this.connections) {
      try {
        await this.deleteConnection(connection.server.name);
      } catch (error) {
        console.error(
          `Failed to close connection for ${connection.server.name}:`,
          error,
        );
      }
    }
    this.connections = [];
  }
}

const mcpHub = new McpHub();

export const startMcpHub = async (
  dbs: DBS,
  testConfig?: Pick<DBSSchema["mcp_server_configs"], "server_name" | "config">,
): Promise<void> => {
  const mcpServers = await dbs.mcp_servers.find(
    { enabled: true },
    { select: { "*": 1, mcp_server_configs: "*" } },
  );
  const serversConfig: ServersConfig = Object.fromEntries(
    mcpServers.map((server) => {
      const { config_schema, ...rest } = server;
      const mcp_server_configs: DBSSchema["mcp_server_configs"][] =
        server.mcp_server_configs ?? [];
      const config =
        testConfig?.server_name === server.name ?
          testConfig.config
        : mcp_server_configs[0]?.config;

      const env = {
        /** Needed for puppeteer */
        ...(server.name === "puppeteer" &&
          (pickKeys(process.env, ["DISPLAY"]) as Record<string, string>)),
        ...(server.env ?? {}),
      };
      const args = server.args ?? [];
      if (config_schema) {
        Object.entries(config_schema).forEach(
          ([key, configItem], itemIndex) => {
            if (configItem.type === "env") {
              env[key] = config[key];
            } else {
              const dollarArgIndexes = args
                .map((a, i) => (a.startsWith("${") ? i : undefined))
                .filter(isDefined);
              const argIndex = dollarArgIndexes[configItem.index ?? itemIndex];
              if (argIndex) {
                args[argIndex] = config[key];
              } else {
                console.error(
                  `Invalid index for arg "${key}" in server "${server.name}"`,
                );
              }
            }
          },
        );
      }
      return [
        server.name,
        {
          ...server,
          args,
          env,
          stderr: undefined,
          cwd: server.cwd,
        },
      ];
    }),
  );
  await mcpHub.setServerConnections(serversConfig);
};

export const reloadMcpServerTools = async (dbs: DBS, serverName: string) => {
  await startMcpHub(dbs);
  const connection = mcpHub.connections.find(
    (conn) => conn.server.name === serverName,
  );
  const tools = connection?.server.tools;
  if (tools) {
    await dbs.tx(async (tx) => {
      await tx.mcp_server_tools.delete({ server_name: serverName });
      await tx.mcp_server_tools.insert(
        tools.map((tool) => ({
          ...tool,
          server_name: serverName,
        })),
      );
    });
    return tools.length;
  }
};

export const callMCPServerTool = async (
  dbs: DBS,
  serverName: string,
  toolName: string,
  toolArguments?: Record<string, unknown>,
): Promise<McpToolCallResponse> => {
  await startMcpHub(dbs);
  const res = await mcpHub.callTool(serverName, toolName, toolArguments);
  return res;
};
