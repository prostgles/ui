import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";

export const fetchMCPToolsList = async (client: Client) => {
  try {
    const response = await client.request(
      { method: "tools/list" },
      ListToolsResultSchema,
    );

    const tools = response.tools.map(
      ({
        /* Exclude mode as it is a prostgles-specific setting */
        // @ts-expect-error
        mode,
        ...tool
      }) => ({
        ...tool,
        description: tool.description ?? "",
      }),
    );
    return tools;
  } catch (_error) {
    return [];
  }
};
