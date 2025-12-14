import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { JSONB } from "prostgles-types";
import type { ProstglesService } from "../../ServiceManagerTypes";

const inputSchema = {
  type: {
    ...PROSTGLES_MCP_SERVERS_AND_TOOLS["websearch"]["websearch"]["schema"].type,
    format: { enum: ["json"] },
  },
} as const satisfies JSONB.FieldType;

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

      inputSchema: inputSchema,
      outputSchema: {
        type: {
          results: {
            ...PROSTGLES_MCP_SERVERS_AND_TOOLS["websearch"]["websearch"][
              "outputSchema"
            ],
          },
        },
      },
    },
  },
} as const satisfies ProstglesService;
