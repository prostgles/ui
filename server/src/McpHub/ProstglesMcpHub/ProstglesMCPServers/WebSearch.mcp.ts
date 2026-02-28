import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { getEntries } from "@common/utils";
import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";
import { getServiceManager } from "@src/ServiceManager/ServiceManager";
import { getJSONBSchemaAsJSONSchema } from "prostgles-types";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
  ProstglesMcpServerHandlerTyped,
} from "../ProstglesMCPServerTypes";
import { McpHub } from "@src/McpHub/AnthropicMcpHub/McpHub";
import { tout } from "@src/utils/tout";
import type { ProcessLog } from "@src/McpHub/DockerSandbox/executeDockerCommand";

const definition = {
  icon_path: "Web",
  label: "Web Search",
  description: "Search the web for information",
  tools: PROSTGLES_MCP_SERVERS_AND_TOOLS["websearch"],
} as const satisfies ProstglesMcpServerDefinition;

const withRetries = async <T>(
  fn: () => Promise<T>,
  attempts = 3,
  delay = 1000,
): Promise<T> => {
  try {
    const success = await fn();
    return success;
  } catch (error) {
    if (attempts <= 1) {
      throw error;
    }
    console.warn(`Retrying in ${delay}ms...`);
    await tout(delay);
    return withRetries(fn, attempts - 1, delay);
  }
};

const handler = {
  start: async (dbs) => {
    const serviceManager = getServiceManager(dbs);

    let logs: ProcessLog[] = [];

    const getService = async <
      S extends Parameters<typeof serviceManager.enableService>[0],
    >(
      serviceName: S,
    ) => {
      await withRetries(() => {
        return serviceManager.enableService(serviceName, (log) => {
          logs = log;
        });
      }).catch((error) => {
        console.error(
          `Failed to start ${serviceName} service for Web Search MCP Server`,
          { error, logs: logs.map((l) => l.text).join("\n") },
        );
        throw new Error(
          "Failed to start ${serviceName} service for Web Search MCP Server. Check server logs for details.",
        );
      });

      const serviceInstance = serviceManager.getService(serviceName);
      if (serviceInstance?.status !== "running") {
        throw new Error(
          `Failed to start ${serviceName} service for Web Search MCP Server`,
        );
      }
      return serviceInstance;
    };
    const webSearchService = await getService("webSearchSearxng");

    return {
      stop: () => {
        serviceManager.stopService("webSearchSearxng");
      },
      tools: {
        websearch: async (toolArguments, { clientReq }) => {
          const clientIp =
            clientReq.httpReq?.ip ||
            clientReq.socket?.handshake.address ||
            "127.0.0.1";
          const result = await webSearchService.endpoints["/search"](
            { ...toolArguments, format: "json" },
            {
              headers: {
                "X-Forwarded-For": clientIp,
                "X-Real-IP": clientIp,
              },
            },
          );

          return result.results;
        },
        get_snapshot: async (toolArguments) => {
          const mcpHub = new McpHub();
          await mcpHub.setServerConnections({
            // fetch: {
            //   command: "uvx",
            //   args: ["mcp-server-fetch"],
            //   server_name: "fetch",
            //   onLog: () => {},
            // },
            playwright: {
              command: "npx",
              args: ["@playwright/mcp@latest", "--isolated"],
              onLog: () => {},
              server_name: "playwright",
            },
          });
          const navigationResult = await mcpHub.callTool(
            "playwright",
            "browser_navigate",
            toolArguments,
          );
          if (navigationResult.isError) {
            await mcpHub.destroy();
            throw new Error(
              `Failed to get snapshot: ${JSON.stringify(navigationResult.content)}`,
            );
          }

          // 2. Check Content Type using browser_evaluate
          const contentTypeResult = await mcpHub.callTool(
            "playwright",
            "browser_evaluate",
            { function: "() => document.contentType" },
          );

          if (contentTypeResult.isError) {
            throw new Error(
              `Failed to check content type: ${JSON.stringify(contentTypeResult.content)}`,
            );
          }

          // Extract the text content from the MCP response
          const contentType = contentTypeResult.content
            .map((item) => (item.type === "text" ? item.text : ""))
            .join("")
            .trim()
            .split(`### Result`)[1]
            ?.split(`### Ran Playwright code`)[0];

          // 3. Validate Content Type
          // Allow text/html, reject application/pdf, image/*, etc.
          if (!contentType?.includes("text/html")) {
            await mcpHub.destroy();
            throw new Error(
              [
                `Unsupported content type detected: "${contentType}".`,
                `Snapshot only supports HTML pages.`,
                `Use get_document_text tool for non-HTML content.`,
              ].join(" "),
            );
          }
          const snapshotResult = await mcpHub.callTool(
            "playwright",
            "browser_snapshot",
          );
          if (snapshotResult.isError) {
            await mcpHub.destroy();
            throw new Error(
              `Failed to get snapshot: ${JSON.stringify(snapshotResult.content)}`,
            );
          }
          await mcpHub.destroy();
          return (
            snapshotResult.content
              .map((item) => (item.type === "text" ? item.text : ""))
              .join("\n") || ""
          );
        },
        get_document_text: async ({ url }) => {
          const docsService = await getService("documents");
          const result = await docsService.endpoints["/v1/convert/source"](
            {
              sources: [{ kind: "http", url }],
              options: {
                image_export_mode: "placeholder",
              },
            },
            {
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
            },
          );
          return result.document.md_content;
        },
      },
      fetchTools: () => {
        return getEntries(PROSTGLES_MCP_SERVERS_AND_TOOLS["websearch"]).map(
          ([name, { schema, description }]) => ({
            name,
            description,
            inputSchema: getJSONBSchemaAsJSONSchema(
              "",
              "",
              schema,
            ) as McpTool["inputSchema"],
          }),
        );
      },
    };
  },
} satisfies ProstglesMcpServerHandlerTyped<typeof definition>;

export const WebSearchMCPServer = {
  definition,
  handler: handler as ProstglesMcpServerHandler,
};
