import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
  ProstglesMcpServerHandlerTyped,
} from "../../ProstglesMCPServerTypes";

import { getEntries } from "@common/utils";
import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";
import { getValidatedWebAppPath } from "@src/serverFunctions/adminServerFunctions/webApp/getValidatedWebAppPath";
import { readWebAppFiles } from "@src/serverFunctions/adminServerFunctions/webApp/readWebAppFiles";
import { glob } from "glob";
import { getJSONBSchemaAsJSONSchema, omitKeys } from "prostgles-types";
import { createComponent } from "./tools/createComponent";
import { createComponentQuickFeedbackPreview } from "./tools/createComponentQuickFeedbackPreview";
import { getWebDevChatAndConnection } from "./tools/getWebDevChatAndConnection";
import { searchWebDevFiles } from "./tools/searchWebDevFiles";

const toolsSchema = PROSTGLES_MCP_SERVERS_AND_TOOLS["webdev"];

const definition = {
  icon_path: "React",
  label: "Web Dev Environment",
  description: "React vite based web development environment.",
  tools: toolsSchema,
} as const satisfies ProstglesMcpServerDefinition;

const handler = {
  start: (dbs) => {
    return {
      stop: () => {},
      tools: {
        list_directory: async ({ directoryPath }, { chat, connection_id }) => {
          const { web_app_directory } = await getWebDevChatAndConnection(dbs, {
            chat,
            connection_id,
          });

          const { filePath } = getValidatedWebAppPath({
            web_app_directory,
            relativePath: directoryPath || "/",
          });
          const result = await glob("*", {
            cwd: filePath,
            absolute: false,
            nodir: false,
            maxDepth: 1,
          });
          const limit = 100;
          if (result.length > limit) {
            return [...result.slice(0, limit), "[...truncated]"];
          }
          return result;
        },
        read_files: async ({ filePaths }, { chat, connection_id }) => {
          await getWebDevChatAndConnection(dbs, {
            chat,
            connection_id,
          });
          const result = await readWebAppFiles(
            { connectionId: connection_id, filePaths },
            { dbo: dbs },
          );
          return result;
        },
        search_files: async (
          { contentQuery, fileNameQuery, extensions },
          { chat, connection_id },
        ) => {
          const { web_app_directory } = await getWebDevChatAndConnection(dbs, {
            chat,
            connection_id,
          });
          const { result } = await searchWebDevFiles({
            contentQuery,
            fileNameQuery,
            extensions,
            web_app_directory,
            folder: "client",
          });
          return result;
        },
        create_component_quick_feedback_preview:
          createComponentQuickFeedbackPreview,
        create_component: createComponent,
      },
      fetchTools: () => {
        return getEntries(toolsSchema).map(([tool_name, tool_info]) => ({
          name: tool_name,
          description: tool_info.description,
          inputSchema: omitKeys(
            getJSONBSchemaAsJSONSchema("", "", tool_info.schema),
            ["$id", "$schema"],
          ) as McpTool["inputSchema"],
        }));
      },
    };
  },
} satisfies ProstglesMcpServerHandlerTyped<typeof definition>;

export const WebDevMCPServer = {
  definition,
  handler: handler as ProstglesMcpServerHandler,
};
