import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";
import type { McpTool } from "./McpTypes";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";

export const fetchMCPToolsList = async (client: Client): Promise<McpTool[]> => {
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
