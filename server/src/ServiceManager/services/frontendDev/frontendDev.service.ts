import type { ProstglesService } from "../../ServiceManagerTypes";

export const frontendDevService = {
  icon: "MicrophoneMessage",
  label: "Frontend Development",
  description: "React vite based web dev environment.",
  port: 5173,
  healthCheck: { endpoint: "/" },
  endpoints: {
    "/": {
      method: "GET",
      inputSchema: undefined,
      description: "Root endpoint",
      outputSchema: {
        type: "string",
      },
    },
  },
} as const satisfies ProstglesService;
