import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { fromEntries, getEntries } from "@common/utils";
import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";
import { getJSONBSchemaAsJSONSchema } from "prostgles-types";

export const prostglesUiToolSchemas = fromEntries(
  getEntries(PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]).map(
    ([toolName, { schema, description }]) => {
      return [
        toolName,
        {
          name: toolName,
          description,
          inputSchema: getJSONBSchemaAsJSONSchema(
            "",
            "",
            schema,
          ) as McpTool["inputSchema"],
        },
      ];
    },
  ),
);
