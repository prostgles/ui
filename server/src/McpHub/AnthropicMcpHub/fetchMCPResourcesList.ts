import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { McpResource } from "./McpTypes";
import { ListResourcesResultSchema } from "@modelcontextprotocol/sdk/types.js";

export const fetchMCPResourcesList = async (
  client: Client,
): Promise<McpResource[]> => {
  try {
    const response = await client.request(
      { method: "resources/list" },
      ListResourcesResultSchema,
    );
    return response.resources;
  } catch (_error) {
    /** Error ignored because for some reason servers withour resources trigger a McpError: MCP error -32601: Method not found */
    return [];
  }
};
