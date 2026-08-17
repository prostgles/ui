import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { fromEntries, getEntries } from "@common/utils";
import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";
import { getServiceManager } from "@src/init/prostglesOnReady";
import { getJSONBSchemaAsJSONSchema } from "prostgles-types";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
  ProstglesMcpServerHandlerTyped,
} from "../ProstglesMCPServerTypes";
import { CONVERT_DOCUMENT_DEFAULT_OPTIONS } from "@src/ServiceManager/services/documents/documents.service";

const tools = PROSTGLES_MCP_SERVERS_AND_TOOLS["documents"];

const definition = {
  icon_path: "TextBoxSearchOutline",
  label: "Documents",
  description: "Convert documents to text and extract information from them",
  tools,
  config_schema: undefined,
} as const satisfies ProstglesMcpServerDefinition;

const handler = {
  start: () => {
    const serviceManager = getServiceManager();

    return {
      stop: () => {
        serviceManager.stopService("documents");
      },
      tools: {
        get_document_text: async ({
          fileAsBase64,
          contentType,
          to_format = CONVERT_DOCUMENT_DEFAULT_OPTIONS.to_formats[0],
          ...otherOpts
        }) => {
          const docsService =
            await serviceManager.getServiceWithRetries("documents");
          const fileBuffer = Buffer.from(fileAsBase64, "base64");
          const blobWithType = new Blob([fileBuffer], { type: contentType });
          const result = await docsService.endpoints["/v1/convert/file"]({
            files: [blobWithType],
            ...CONVERT_DOCUMENT_DEFAULT_OPTIONS,
            image_export_mode: "embedded",
            to_formats: [to_format],
            ...otherOpts,
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

export const DocumentsMCPServer = {
  definition,
  handler: handler as ProstglesMcpServerHandler,
};
