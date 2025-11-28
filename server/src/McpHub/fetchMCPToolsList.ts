import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";

export const fetchMCPToolsList = async (client: Client) => {
  try {
    const response = await client.request(
      { method: "tools/list" },
      ListToolsResultSchema,
    );

    const autoApproveConfig: string[] = [];
    const tools = response.tools.map((tool) => ({
      ...tool,
      description: tool.description ?? "",
      autoApprove: autoApproveConfig.includes(tool.name),
    }));
    return tools;
  } catch (_error) {
    return [];
  }
};
