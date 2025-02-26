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
import {
  isDefined,
  isEqual,
  pickKeys,
  SubscriptionHandler,
  tryCatchV2,
  ValueOf,
} from "prostgles-types";
import { z } from "zod";
import { DBS, tout } from "..";
import { DefaultMCPServers } from "../../../commonTypes/mcp";
import { DBSSchema } from "../../../commonTypes/publishUtils";
import { MCP_DIR } from "./installMCPServer";
import {
  McpResource,
  McpResourceResponse,
  McpResourceTemplate,
  McpServer,
  McpServerEvents,
  McpTool,
  McpToolCallResponse,
  ServersConfig,
} from "./McpTypes";
import { connectToMCPServer } from "./connectToMCPServer";
import { fetchMCPServerConfigs } from "./fetchMCPServerConfigs";

export type McpConnection = {
  server: McpServer;
  client: Client;
  transport: StdioClientTransport;
  destroy: () => Promise<void>;
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
  connections: Record<string, McpConnection> = {};
  isConnecting = false;

  constructor() {
    // this.providerRef = provider;
    // this.watchMcpSettingsFile();
  }

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

    // const { onLog } = evs;

    // try {
    //   await onLog("stderr", "");
    //   await onLog("error", "");
    //   // Each MCP server requires its own transport connection and has unique capabilities, configurations, and error handling.
    //   // Having separate clients also allows proper scoping of resources/tools and independent server management like reconnection.
    //   const client = new Client(
    //     {
    //       name: "Prostgles",
    //       version: "1.0.0",
    //     },
    //     {
    //       capabilities: {},
    //     },
    //   );

    //   const transport = new StdioClientTransport({
    //     command: config.command,
    //     args: config.args,
    //     env: {
    //       ...config.env,
    //       ...(process.env.PATH ? { PATH: process.env.PATH } : {}),
    //       // ...(process.env.NODE_PATH ? { NODE_PATH: process.env.NODE_PATH } : {}),
    //     },
    //     stderr: "pipe", // necessary for stderr to be available
    //   });

    //   transport.onerror = async (error) => {
    //     console.error(`Transport error for "${name}":`, error);
    //     const connection = this.connections[name];
    //     if (connection) {
    //       connection.server.status = "disconnected";
    //       this.appendErrorMessage(connection, error.message);
    //     }
    //     // await this.notifyWebviewOfServerChanges();
    //   };

    //   transport.onclose = async () => {
    //     const connection = this.connections[name];
    //     if (connection) {
    //       connection.server.status = "disconnected";
    //     }
    //     // await this.notifyWebviewOfServerChanges();
    //   };

    //   // If the config is invalid, show an error
    //   if (!StdioConfigSchema.safeParse(config).success) {
    //     onLog(
    //       "error",
    //       `Invalid config for "${name}": missing or invalid parameters`,
    //     );
    //     const connection: McpConnection = {
    //       server: {
    //         name,
    //         config,
    //         status: "disconnected",
    //         error: "Invalid config: missing or invalid parameters",
    //       },
    //       client,
    //       transport,
    //     };
    //     this.connections[name] = connection;
    //     return;
    //   }

    //   // valid schema
    //   const parsedConfig = StdioConfigSchema.parse(config);
    //   const connection: McpConnection = {
    //     server: {
    //       name,
    //       config,
    //       status: "connecting",
    //       disabled: parsedConfig.disabled,
    //     },
    //     client,
    //     transport,
    //   };
    //   this.connections[name] = connection;

    //   // transport.stderr is only available after the process has been started. However we can't start it separately from the .connect() call because it also starts the transport. And we can't place this after the connect call since we need to capture the stderr stream before the connection is established, in order to capture errors during the connection process.
    //   // As a workaround, we start the transport ourselves, and then monkey-patch the start method to no-op so that .connect() doesn't try to start it again.
    //   await transport.start();
    //   const stderrStream = transport.stderr;
    //   if (stderrStream) {
    //     stderrStream.on("data", async (data: Buffer) => {
    //       const errorOutput = data.toString();
    //       console.error(`Server "${name}" stderr:`, errorOutput);
    //       onLog("stderr", errorOutput);
    //       const connection = this.connections[name];
    //       if (connection) {
    //         // NOTE: we do not set server status to "disconnected" because stderr logs do not necessarily mean the server crashed or disconnected, it could just be informational. In fact when the server first starts up, it immediately logs "<name> server running on stdio" to stderr.
    //         this.appendErrorMessage(connection, errorOutput);
    //         // Only need to update webview right away if it's already disconnected
    //         if (connection.server.status === "disconnected") {
    //           // await this.notifyWebviewOfServerChanges();
    //         }
    //       }
    //     });
    //   } else {
    //     console.error(`No stderr stream for ${name}`);
    //   }
    //   transport.start = async () => {}; // No-op now, .connect() won't fail

    //   // Connect
    //   await client.connect(transport);
    //   connection.server.status = "connected";
    //   connection.server.error = "";

    //   // Initial fetch of tools and resources
    //   connection.server.tools = await this.fetchToolsList(name);
    //   connection.server.resources = await this.fetchResourcesList(name);
    //   connection.server.resourceTemplates =
    //     await this.fetchResourceTemplatesList(name);
    // } catch (error) {
    //   // Update status with error
    //   const connection = this.connections[name];
    //   if (connection) {
    //     connection.server.status = "disconnected";
    //     const errMsg = error instanceof Error ? error.message : String(error);
    //     onLog("error", errMsg);
    //   }
    //   throw error;
    // }
  }

  private async fetchToolsList(serverName: string): Promise<McpTool[]> {
    try {
      const response = await this.connections[serverName]?.client.request(
        { method: "tools/list" },
        ListToolsResultSchema,
      );

      const autoApproveConfig: string[] = [];
      const tools = (response?.tools || []).map((tool) => ({
        ...tool,
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
    const connection = this.connections[serverName];
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
  testConfig?: Pick<DBSSchema["mcp_server_configs"], "server_name" | "config">,
): Promise<void> => {
  mcpHubReInitializingRequested = mcpHubInitializing;
  mcpHubInitializing = true;
  const result = await tryCatchV2(async () => {
    // const mcpServers = await dbs.mcp_servers.find(
    //   { enabled: true },
    //   { select: { "*": 1, mcp_server_configs: "*" } },
    // );
    // const globalSettings = await dbs.global_settings.findOne();
    // if (globalSettings?.mcp_servers_disabled) {
    //   await mcpHub.dispose();
    //   return;
    // }

    const serversConfig = await fetchMCPServerConfigs(dbs, testConfig);
    await mcpHub.setServerConnections(serversConfig);
  });
  mcpHubInitializing = false;
  if (mcpHubReInitializingRequested) {
    mcpHubReInitializingRequested = false;
    startMcpHub(dbs);
  }
  if (result.error) {
    throw result.error;
  }
  return result.data;
};

export const reloadMcpServerTools = async (dbs: DBS, serverName: string) => {
  await startMcpHub(dbs);
  const connection = mcpHub.connections[serverName];
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
        cwd: MCP_DIR,
        ...server,
      })),
    );
  }
  for await (const sub of Object.values(mcpSubscriptions)) {
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
      startMcpHub(dbs);
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
  (
    await connectToMCPServer(
      config.server_name,
      mcpConfig[config.server_name]!,
      { onLog: () => {}, onTransportClose: () => {} },
    )
  ).destroy();
};
