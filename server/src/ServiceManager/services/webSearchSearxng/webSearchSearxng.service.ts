import type { ProstglesService } from "../../ServiceManagerTypes";

export const webSearchSearxngService = {
  icon: "Web",
  label: "Web Search",
  port: 8080,
  hostPort: 8888,
  healthCheck: { method: "GET", endpoint: "/search" },
  description: "Web search using searxng. Used in the AI Assistant chat.",
  endpoints: {},
} as const satisfies ProstglesService;
