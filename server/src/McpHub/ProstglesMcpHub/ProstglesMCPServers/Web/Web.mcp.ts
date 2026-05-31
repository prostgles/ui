import {
  PROSTGLES_MCP_SERVER_CONFIGS,
  PROSTGLES_MCP_SERVERS_AND_TOOLS,
} from "@common/prostglesMcp";
import { fromEntries, getEntries } from "@common/utils";
import { McpHub } from "@src/McpHub/AnthropicMcpHub/McpHub";
import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";
import { getServiceManager } from "@src/ServiceManager/ServiceManager";
import { getJSONBSchemaAsJSONSchema } from "prostgles-types";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
  ProstglesMcpServerHandlerTyped,
} from "../../ProstglesMCPServerTypes";
import { CONVERT_DOCUMENT_DEFAULT_OPTIONS } from "@src/ServiceManager/services/documents/documents.service";
import { checkConfigAccess } from "./checkConfigAccess";

const tools = PROSTGLES_MCP_SERVERS_AND_TOOLS["web"];

const definition = {
  icon_path: "Web",
  label: "Web Search",
  description: "Search the web for information",
  config_schema: PROSTGLES_MCP_SERVER_CONFIGS["web"],
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
        fetch: async (
          {
            url,
            mode = "raw",
            max_length = 5000,
            start_index = 0,
            headers,
            timeout = 15000,
          },
          _,
          config,
        ) => {
          let content = "";

          await checkConfigAccess(url, config);
          if (mode === "raw") {
            const res = await fetch(url, {
              redirect: "follow",
              headers: {
                "User-Agent": "Mozilla/5.0 ",
              },
              signal: AbortSignal.timeout(timeout),
              ...headers,
            });

            if (!res.ok) {
              throw new Error(
                `Failed to fetch ${url} - status code ${res.status}`,
              );
            }

            content = await res.text();
          } else {
            const docsService =
              await getServiceManager(dbs).getServiceWithRetries("documents");
            const result = await docsService.endpoints["/v1/convert/source"]({
              sources: [{ kind: "http", url }],
              options: {
                from_formats: ["html"],
                ...CONVERT_DOCUMENT_DEFAULT_OPTIONS,
              },
            });

            content =
              result.document.md_content ||
              result.document.doctags_content ||
              JSON.stringify(result.document.json_content) ||
              result.document.text_content ||
              result.document.html_content ||
              "";
          }

          if (!content) {
            return "<error>Page failed to be fetched or converted</error>";
          }

          return sliceFetchedContent(content, start_index, max_length);
        },
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
        get_snapshot: async (toolArguments, _, config) => {
          await checkConfigAccess(toolArguments.url, config);

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
        get_document_text: async ({ url, ...otherOpts }, _, config) => {
          await checkConfigAccess(url, config);

          const docsService =
            await serviceManager.getServiceWithRetries("documents");
          const result = await docsService.endpoints["/v1/convert/source"]({
            sources: [{ kind: "http", url }],
            options: {
              ...CONVERT_DOCUMENT_DEFAULT_OPTIONS,
              ...otherOpts,
            },
          });
          const {
            text_content,
            doctags_content,
            html_content,
            json_content,
            md_content,
          } = result.document;
          return String(
            text_content ||
              md_content ||
              html_content ||
              doctags_content ||
              JSON.stringify(json_content) ||
              "",
          );
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

export const WebMCPServer = {
  definition,
  handler: handler as ProstglesMcpServerHandler,
};

const sliceFetchedContent = (
  content: string,
  start_index = 0,
  max_length = 5000,
) => {
  if (start_index >= content.length) {
    return "<error>No more content available.</error>";
  }

  const sliced = content.slice(start_index, start_index + max_length);
  const nextIndex = start_index + sliced.length;

  if (nextIndex < content.length) {
    return `${sliced}\n\n<error>Content truncated. Call the fetch tool with a start_index of ${nextIndex} to get more content.</error>`;
  }

  return sliced;
};
