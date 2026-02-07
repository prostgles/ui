import { dashboardTypesContent } from "@common/dashboardTypesContent";
import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";
import { getJSONBSchemaAsJSONSchema } from "prostgles-types";

const name = "suggest_dashboards" as const;
export const suggestDashboardsToolSchema = {
  name,
  description: [
    "Suggests dashboards based on the provided task description",

    "",
    "Using dashboard structure below create workspaces with useful views my current schema.",
    "Return a json of this format: `{ prostglesWorkspaces: WorkspaceInsertModel[] }`",
    "Do not return more than 3 workspaces, each with no more than 5 views.",
    "",
    "```typescript",
    dashboardTypesContent,
    "```",
  ].join("\n"),
  inputSchema: getJSONBSchemaAsJSONSchema(
    "",
    "",
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"][name].schema,
  ) as McpTool["inputSchema"],
};
