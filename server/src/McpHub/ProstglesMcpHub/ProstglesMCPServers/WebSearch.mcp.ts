import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { fromEntries, getEntries } from "@common/utils";
import { McpHub } from "@src/McpHub/AnthropicMcpHub/McpHub";
import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";
import { getServiceManager } from "@src/ServiceManager/ServiceManager";
import { getJSONBSchemaAsJSONSchema } from "prostgles-types";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
  ProstglesMcpServerHandlerTyped,
} from "../ProstglesMCPServerTypes";
import { CONVERT_DOCUMENT_DEFAULT_OPTIONS } from "@src/ServiceManager/services/documents/documents.service";

const tools = PROSTGLES_MCP_SERVERS_AND_TOOLS["websearch"];

const definition = {
  icon_path: "Web",
  label: "Web Search",
  description: "Search the web for information",
  tools,
} as const satisfies ProstglesMcpServerDefinition;

const handler = {
  start: (dbs) => {
    const serviceManager = getServiceManager(dbs);

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
          const webSearchService =
            await serviceManager.getServiceWithRetries("webSearchSearxng");
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
            playwright: {
              command: "npx",
              args: ["@playwright/mcp@latest", "--isolated"],
              onLog: () => {},
              env: {
                /** Prevent snapshots being saved in .playwright */
                PLAYWRIGHT_MCP_SAVE_SESSION: "false",
                PLAYWRIGHT_MCP_SAVE_TRACE: "false",
              },
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
        get_document_text: async ({ url, ...otherOpts }) => {
          const docsService =
            await serviceManager.getServiceWithRetries("documents");
          const result = await docsService.endpoints["/v1/convert/source"]({
            sources: [{ kind: "http", url }],
            options: {
              ...CONVERT_DOCUMENT_DEFAULT_OPTIONS,
              ...otherOpts,
            },
          });
          return result.document.md_content || "";
        },
      },
      fetchTools: () => {
        return fromEntries(
          getEntries(tools).map(([name, { schema, description }]) => [
            name,
            {
              name,
              description,
              inputSchema: getJSONBSchemaAsJSONSchema(
                "",
                "",
                schema,
              ) as McpTool["inputSchema"],
            },
          ]),
        );
      },
    };
  },
} satisfies ProstglesMcpServerHandlerTyped<typeof definition>;

export const WebSearchMCPServer = {
  definition,
  handler: handler as ProstglesMcpServerHandler,
};
