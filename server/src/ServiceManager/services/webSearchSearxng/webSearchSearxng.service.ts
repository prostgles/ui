import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { ProstglesService } from "../../ServiceManagerTypes";

export const webSearchSearxngService = {
  icon: "Web",
  label: "Web Search",
  port: 8080,
  hostPort: 8888,
  healthCheck: { method: "GET", endpoint: "/search" },
  description: "Web search using searxng. Used in the AI Assistant chat.",
  endpoints: {
    "/search": {
      method: "GET",
      description: "SearXNG search endpoint",

      inputSchema:
        PROSTGLES_MCP_SERVERS_AND_TOOLS["web-search"]["web_search"]["schema"],
      outputSchema:
        PROSTGLES_MCP_SERVERS_AND_TOOLS["web-search"]["web_search"][
          "outputSchema"
        ],
    },
  },
} as const satisfies ProstglesService;
