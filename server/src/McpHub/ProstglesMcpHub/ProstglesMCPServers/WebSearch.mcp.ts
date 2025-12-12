import { spawn } from "node:child_process";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
} from "../ProstglesMCPServers";

export const WebSearchMCPServerDefinition = {
  icon_path: "WebSearch",
  label: "Web Search",
  description: "Performs web searches using searxng",
  tools: {
    web_search: {
      description: "Perform a web search and return results",
      inputSchema: {
        type: {
          query: { type: "string" },
          max_results: { type: "integer", optional: true },
        },
      },
      outputSchema: {
        arrayOfType: {
          title: { type: "string" },
          url: { type: "string" },
          snippet: { type: "string" },
        },
      },
    },
  },
  config_schema: {
    type: {
      searxng_url: { type: "string", optional: true },
    },
  },
} satisfies ProstglesMcpServerDefinition;

// export const WebSearchMCPServer: ProstglesMcpServerHandler<
//   typeof WebSearchMCPServerDefinition
// > = {
//   start: async (config) => {
//     let searxngUrl = config.searxng_url;
//     if (!searxngUrl) {
//       // spawn docker searxng instance or use default
//       const spawnedDocker = spawn("docker", [
//         "run",
//         "--rm",
//         "-d",
//         "-p",
//         "localhost:8888:8888",
//         "searxng/searxng:latest",
//       ]);
//       searxngUrl = "http://localhost:8888";
//     }

//     return {
//       stop: () => {
//         // Cleanup resources if needed
//       },
//       callTool: (toolName, toolArguments, context) => {
//         throw new Error(
//           `Tool ${toolName} not implemented yet in Web Search MCP Server`,
//         );
//       },
//     };
//   },
// };
