import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { getEntries } from "@common/utils";
import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";
import { getServiceManager } from "@src/ServiceManager/ServiceManager";
import { getJSONBSchemaAsJSONSchema } from "prostgles-types";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
  ProstglesMcpServerHandlerTyped,
} from "../ProstglesMCPServerTypes";
import { McpHub } from "@src/McpHub/AnthropicMcpHub/McpHub";

const definition = {
  icon_path: "Web",
  label: "Web Search",
  description: "Search the web for information",
  tools: PROSTGLES_MCP_SERVERS_AND_TOOLS["websearch"],
} as const satisfies ProstglesMcpServerDefinition;

const handler = {
  start: async (dbs) => {
    const searXngService = getServiceManager(dbs);
    await searXngService
      .enableService("webSearchSearxng", () => {})
      .catch(console.error);

    const serviceInstance = searXngService.getService("webSearchSearxng");
    if (serviceInstance?.status !== "running") {
      throw new Error(
        "Failed to start SearXNG service for Web Search MCP Server",
      );
    }

    return {
      stop: () => {
        searXngService.stopService("webSearchSearxng");
      },
      tools: {
        websearch: async (toolArguments, { clientReq }) => {
          const clientIp =
            clientReq.httpReq?.ip ||
            clientReq.socket?.handshake.address ||
            "127.0.0.1";
          const result = await serviceInstance.endpoints["/search"](
            { ...toolArguments, format: "json" },
            {
              headers: {
                "X-Forwarded-For": clientIp,
                "X-Real-IP": clientIp,
              },
            },
          );

          return result.results;
        },
        get_snapshot: async (toolArguments) => {
          const mcpHub = new McpHub();
          await mcpHub.setServerConnections({
            // fetch: {
            //   command: "uvx",
            //   args: ["mcp-server-fetch"],
            //   server_name: "fetch",
            //   onLog: () => {},
            // },
            playwright: {
              command: "npx",
              args: ["@playwright/mcp@latest", "--isolated"],
              onLog: () => {},
              server_name: "playwright",
            },
          });
          const result1 = await mcpHub.callTool(
            "playwright",
            "browser_navigate",
            toolArguments,
          );
          if (result1.isError) {
            await mcpHub.destroy();
            throw new Error(
              `Failed to get snapshot: ${JSON.stringify(result1.content)}`,
            );
          }
          const result2 = await mcpHub.callTool(
            "playwright",
            "browser_snapshot",
          );
          if (result2.isError) {
            await mcpHub.destroy();
            throw new Error(
              `Failed to get snapshot: ${JSON.stringify(result2.content)}`,
            );
          }
          await mcpHub.destroy();
          return (
            result2.content
              .map((item) => (item.type === "text" ? item.text : ""))
              .join("\n") || ""
          );
        },
      },
      fetchTools: () => {
        return getEntries(PROSTGLES_MCP_SERVERS_AND_TOOLS["websearch"]).map(
          ([name, { schema, description }]) => ({
            name,
            description,
            inputSchema: getJSONBSchemaAsJSONSchema(
              "",
              "",
              schema,
            ) as McpTool["inputSchema"],
          }),
        );
      },
    };
  },
} satisfies ProstglesMcpServerHandlerTyped<typeof definition>;

export const WebSearchMCPServer = {
  definition,
  handler: handler as ProstglesMcpServerHandler,
};
