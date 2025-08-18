import { getJSONBSchemaAsJSONSchema } from "prostgles-types";
import { dashboardTypes } from "../../../../../common/DashboardTypes";
import {
  getProstglesMCPFullToolName,
  PROSTGLES_MCP_SERVERS_AND_TOOLS,
} from "../../../../../common/prostglesMcp";
import { fixIndent } from "../../../../../common/utils";

export const executeSQLToolWithRollback = {
  name: getProstglesMCPFullToolName(
    "prostgles-db",
    "execute_sql_with_rollback",
  ),
  description:
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-db"]["execute_sql_with_rollback"]
      .description,
  input_schema: getJSONBSchemaAsJSONSchema(
    "",
    "",
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-db"]["execute_sql_with_rollback"]
      .schema,
  ),
};
export const executeSQLToolWithCommit = {
  name: getProstglesMCPFullToolName("prostgles-db", "execute_sql_with_commit"),
  description:
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-db"]["execute_sql_with_commit"]
      .description,
  input_schema: getJSONBSchemaAsJSONSchema(
    "",
    "",
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-db"]["execute_sql_with_commit"]
      .schema,
  ),
};

const taskInputSchema = getJSONBSchemaAsJSONSchema(
  "",
  "",
  PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["suggest_tools_and_prompt"]
    .schema,
);

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

    If access to the database is needed, an access type can be specified. 
    Use the most restrictive access type that is needed to complete the task (type custom with specific tables and allowed commands).
  `),
  input_schema: taskInputSchema,
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
