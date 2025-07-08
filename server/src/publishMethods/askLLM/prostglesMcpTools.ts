import { getJSONBSchemaAsJSONSchema } from "prostgles-types";
import { dashboardTypes } from "../../../../commonTypes/DashboardTypes";
import {
  getProstglesMCPFullToolName,
  PROSTGLES_MCP_SERVERS_AND_TOOLS,
} from "../../../../commonTypes/mcp";
import { fixIndent } from "../../../../commonTypes/utils";

export const executeSQLTool = {
  name: getProstglesMCPFullToolName("prostgles-db", "execute_sql"),
  description: "Executes a SQL query on the connected database.",
  input_schema: getJSONBSchemaAsJSONSchema(
    "",
    "",
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-db"]["execute_sql"].schema,
  ),
};

export const getAddTaskTools = ({
  availableDBTools = [],
  availableMCPTools = [],
}: {
  availableMCPTools?: { name: string; description: string }[];
  availableDBTools?: { name: string; description: string }[];
} = {}) => ({
  name: getProstglesMCPFullToolName("prostgles-ui", "suggest_tools_and_prompt"),
  description: fixIndent(`
    This tool suggests tools and generates a prompt based on the provided task description.
    The input will be shown to the user, and they can select which tools to use.
    Available MCP tools: 
    ${availableMCPTools.map((t) => `  - ${t.name}: ${t.description}`).join("\n")}

    Available database tools:
    ${availableDBTools.map((t) => `  - ${t.name}: ${t.description}`).join("\n")}
  `),
  input_schema: getJSONBSchemaAsJSONSchema(
    "",
    "",
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["suggest_tools_and_prompt"]
      .schema,
  ),
});

export const suggestDashboardsTool = {
  name: getProstglesMCPFullToolName("prostgles-ui", "suggest_dashboards"),
  description: [
    "Suggests dashboards based on the provided task description",

    "",
    "Using dashboard structure below create workspaces with useful views my current schema.",
    "Return a json of this format: { prostglesWorkspaces: WorkspaceInsertModel[] }",
    "Return valid json, markdown compatible and in a clearly delimited section with a json code block.",
    "",
    dashboardTypes,
  ].join("\n"),
  input_schema: getJSONBSchemaAsJSONSchema(
    "",
    "",
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["suggest_dashboards"]
      .schema,
  ),
};

export const PROSTGLES_MCP_TOOLS = [
  executeSQLTool,
  suggestDashboardsTool,
  getAddTaskTools(),
] as const;
