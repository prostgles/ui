import {
  getJSONBSchemaAsJSONSchema,
  getJSONBSchemaTSTypes,
} from "prostgles-types";
import { dashboardTypesContent } from "@common/dashboardTypesContent";
import {
  getProstglesMCPFullToolName,
  PROSTGLES_MCP_SERVERS_AND_TOOLS,
} from "@common/prostglesMcp";
import { fixIndent } from "@common/utils";

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

const taskToolName = "suggest_tools_and_prompt" as const;
export const getAddTaskTools = ({
  availableDBTools = [],
  availableMCPTools = [],
}: {
  availableMCPTools?: { name: string; description: string }[];
  availableDBTools?: { name: string; description: string }[];
} = {}) => ({
  name: getProstglesMCPFullToolName("prostgles-ui", taskToolName),
  description: fixIndent(`
    This tool will update the user chat context with suggests tools and prompt.
    The input will be shown to the user for confirmation.
    
    Available MCP tools: 
    ${!availableMCPTools.length ? "None" : availableMCPTools.map((t) => `  - ${t.name}: ${t.description}`).join("\n")}

    Available database tools:
    ${!availableDBTools.length ? "None" : availableDBTools.map((t) => `  - ${t.name}: ${t.description}`).join("\n")}

    If access to the database is needed, an access type can be specified. 
    Use the most restrictive access type that is needed to complete the task (type custom with specific tables and allowed commands).

    This tool input_schema must satisfy this typescript type:
    \`\`\`typescript
    ${getJSONBSchemaTSTypes(
      PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"][taskToolName].schema,
      {},
      undefined,
      [],
    )}
    \`\`\`
  `),
  input_schema: {
    description: getJSONBSchemaTSTypes(
      PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"][taskToolName].schema,
      {},
      undefined,
      [],
    ),
  },
});

const workflowToolName = "suggest_agent_workflow" as const;
export const getAddWorkflowTools = ({
  availableDBTools = [],
  availableMCPTools = [],
}: {
  availableMCPTools?: { name: string; description: string }[];
  availableDBTools?: { name: string; description: string }[];
} = {}) => ({
  name: getProstglesMCPFullToolName("prostgles-ui", workflowToolName),
  description: fixIndent(`
    This tool will allow the user to create and start an agent workflow with suggested tools and prompt.
    The input will be shown to the user for confirmation.
    
    ## Available MCP tools: 
    ${!availableMCPTools.length ? "None" : availableMCPTools.map((t) => JSON.stringify(t.name)).join(", ")}

    ## Available database tools:
    ${!availableDBTools.length ? "None" : availableDBTools.map((t) => JSON.stringify(t.name)).join(", ")}

    ## Database Access
    If access to the database is needed, an access type can be specified. 
    Use the most restrictive access type that is needed to complete the task (type custom with specific tables and allowed commands).

    Provide a json input for this tool that satisfies this typescript type:
    \`\`\`typescript
    ${getJSONBSchemaTSTypes(
      PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"][workflowToolName].schema,
      {},
      undefined,
      [],
    )}
    \`\`\`

    Input tool schema details: 
    \`\`\`json
    ${JSON.stringify(PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"][workflowToolName].schema, null, 2)}
    \`\`\`
  `),
  input_schema: {},
});

export const suggestDashboardsTool = {
  name: getProstglesMCPFullToolName("prostgles-ui", "suggest_dashboards"),
  description: [
    "Suggests dashboards based on the provided task description",

    "",
    "Using dashboard structure below create workspaces with useful views my current schema.",
    "Return a json of this format: `{ prostglesWorkspaces: WorkspaceInsertModel[] }`",
    "",
    "```typescript",
    dashboardTypesContent,
    "```",
  ].join("\n"),
  input_schema: getJSONBSchemaAsJSONSchema(
    "",
    "",
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["suggest_dashboards"]
      .schema,
  ),
};
