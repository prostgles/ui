import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";
import { getJSONBSchemaAsJSONSchema } from "prostgles-types";

const name = "ask_user_questions" as const;
const { schema, description } =
  PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"][name];
export const askQuestionsToolSchema = {
  name,
  description,
  inputSchema: getJSONBSchemaAsJSONSchema(
    "",
    "",
    schema,
  ) as McpTool["inputSchema"],
};
