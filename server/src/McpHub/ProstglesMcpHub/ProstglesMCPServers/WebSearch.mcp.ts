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

const definition = {
  icon_path: "Web",
  label: "Web Search",
  description: "Search the web for information",
  tools: PROSTGLES_MCP_SERVERS_AND_TOOLS["web-search"],
} as const satisfies ProstglesMcpServerDefinition;

const handler = {
  start: async (dbs) => {
    const searXngService = getServiceManager(dbs);
    await searXngService.enableService("webSearchSearxng", () => {});
    const serviceInstance = searXngService.getService("webSearchSearxng");
    if (serviceInstance?.status !== "running") {
      throw new Error(
        "Failed to start SearXNG service for Web Search MCP Server",
      );
    }

    return {
      stop: async () => {
        await searXngService.stopService("webSearchSearxng");
      },
      tools: {
        web_search: (toolArguments) => {
          return serviceInstance.endpoints["/search"](toolArguments);
        },
      },
      fetchTools: () => {
        return getEntries(PROSTGLES_MCP_SERVERS_AND_TOOLS["web-search"]).map(
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
