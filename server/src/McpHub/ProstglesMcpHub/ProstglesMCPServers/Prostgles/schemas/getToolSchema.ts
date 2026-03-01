import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";
import { getJSONBSchemaAsJSONSchema } from "prostgles-types";

const name = "get_tool_schemas" as const;
const { schema, description } =
  PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"][name];
export const getToolSchema = {
  name,
  description,
  inputSchema: getJSONBSchemaAsJSONSchema(
    "",
    "",
    schema,
  ) as McpTool["inputSchema"],
};
