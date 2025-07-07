import { getJSONBSchemaAsJSONSchema, type JSONB } from "prostgles-types";
import { dashboardTypes } from "../../../../commonTypes/DashboardTypes";
import { getProstglesMCPFullToolName } from "../../../../commonTypes/mcp";
import { fixIndent } from "../../../../commonTypes/utils";

export const executeSQLToolSchema = {
  type: {
    sql: {
      type: "string",
      description: "SQL query to execute",
    },
  },
} as const satisfies JSONB.ObjectType;

export const executeSQLTool = {
  name: getProstglesMCPFullToolName("prostgles-db", "execute_sql"),
  description: "Run SQL query on the current database",
  input_schema: getJSONBSchemaAsJSONSchema("", "", executeSQLToolSchema),
};

export const taskToolInputJSONBSchema = {
  type: {
    suggested_mcp_tool_names: {
      arrayOf: "string",
    },
    suggested_database_tool_names: {
      // arrayOfType: {
      //   tool_name: "string",
      //   tool_id: "integer",
      // },
      arrayOf: "string",
    },
    suggested_prompt: {
      type: "string",
    },
  },
} as const satisfies JSONB.ObjectType;

export const getAddTaskTools = ({
  availableDBTools = [],
  availableMCPTools = [],
}: {
  availableMCPTools?: { name: string; description: string }[];
  availableDBTools?: { name: string; description: string }[];
} = {}) => ({
  name: getProstglesMCPFullToolName("prostgles-ui", "suggest_tools_and_prompt"),
  description: fixIndent(`
    For a given task description and the available list of tools, returns a list of tools that can be used to complete the task.
    Available MCP tools: 
    ${availableMCPTools.map((t) => `  - ${t.name}: ${t.description}`).join("\n")}

    Available database tools:
    ${availableDBTools.map((t) => `  - ${t.name}: ${t.description}`).join("\n")}
  `),
  input_schema: getJSONBSchemaAsJSONSchema("", "", taskToolInputJSONBSchema),
  // input_schema: {
  //   $schema: "https://json-schema.org/draft/2020-12/schema",
  //   type: "object",
  //   required: ["suggested_mcp_tools", "suggested_prompt"],
  //   properties: {
  //     suggested_mcp_tools: {
  //       type: "array",
  //       items: {
  //         type: "object",
  //         required: ["tool_name"],
  //         properties: {
  //           tool_name: {
  //             type: "string",
  //             ...(availableTools.length ?
  //               { enum: availableTools.map((t) => t.name) }
  //             : {}),
  //           },
  //         },
  //       },
  //     },
  //     suggested_prompt: {
  //       type: "string",
  //       description:
  //         "A prompt that describes the task to be completed using the tools.",
  //     },
  //   },
  // } as any,
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
  input_schema: getJSONBSchemaAsJSONSchema("", "", {
    type: {
      prostglesWorkspaces: {
        description:
          "Workspace to create. Must satisfy the typescript WorkspaceInsertModel type",
        arrayOf: "any",
      },
    },
  }),
  // {
  //   type: "object",
  //   properties: {
  //     prostglesWorkspaces: {
  //       type: "array",
  //       items: {
  //         description:
  //           "Workspace to create. Must satisfy the typescript WorkspaceInsertModel type",
  //       },
  //     },
  //   },
  // },
};

export const PROSTGLES_MCP_TOOLS = [
  executeSQLTool,
  suggestDashboardsTool,
  getAddTaskTools(),
] as const;
