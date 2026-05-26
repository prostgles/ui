import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ListResourceTemplatesResultSchema } from "@modelcontextprotocol/sdk/types.js";
import type { McpResourceTemplate } from "./McpTypes";

export const fetchMCPResourceTemplatesList = async (
  client: Client,
): Promise<McpResourceTemplate[]> => {
  try {
    const response = await client.request(
      { method: "resources/templates/list" },
      ListResourceTemplatesResultSchema,
    );
    return response.resourceTemplates;
  } catch (_error) {
    return [];
  }
};
