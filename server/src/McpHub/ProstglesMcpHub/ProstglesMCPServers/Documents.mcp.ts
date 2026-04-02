import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { fromEntries, getEntries } from "@common/utils";
import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";
import { getServiceManager } from "@src/ServiceManager/ServiceManager";
import { getJSONBSchemaAsJSONSchema } from "prostgles-types";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
  ProstglesMcpServerHandlerTyped,
} from "../ProstglesMCPServerTypes";

const tools = PROSTGLES_MCP_SERVERS_AND_TOOLS["documents"];

const definition = {
  icon_path: "FileDocumentMultipleOutline",
  label: "Documents",
  description: "Convert documents to text and extract information from them",
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
        get_document_text: async ({
          fileAsBase64,
          contentType,
          ...otherOpts
        }) => {
          const docsService =
            await serviceManager.getServiceWithRetries("documents");
          const fileBuffer = Buffer.from(fileAsBase64, "base64");
          const blobWithType = new Blob([fileBuffer], { type: contentType });
          const result = await docsService.endpoints["/v1/convert/file"]({
            files: [blobWithType],
            options: {
              image_export_mode: "placeholder",
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

export const DocumentsMCPServer = {
  definition,
  handler: handler as ProstglesMcpServerHandler,
};
