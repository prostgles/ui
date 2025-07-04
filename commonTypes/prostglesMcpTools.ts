import { fixIndent } from "./utils";

const MCP_TOOL_NAME_SEPARATOR = "--";
export const getMCPFullToolName = <
  Name extends string,
  ServerName extends string,
>({
  server_name,
  name,
}: {
  server_name: ServerName;
  name: Name;
}): `${ServerName}${typeof MCP_TOOL_NAME_SEPARATOR}${Name}` => {
  return `${server_name}${MCP_TOOL_NAME_SEPARATOR}${name}` as const;
};
export const getMCPToolNameParts = (fullName: string) => {
  const [serverName, toolName] = fullName.split(MCP_TOOL_NAME_SEPARATOR);
  if (serverName && toolName) {
    return { serverName, toolName };
  }
};

export const executeSQLTool = {
  name: getMCPFullToolName({
    server_name: "prostgles",
    name: "execute_sql",
  } as const),
  description: "Run SQL query on the current database",
  input_schema: {
    type: "object",
    properties: {
      sql: {
        type: "string",
        description: "SQL query to execute",
      },
    },
    required: ["sql"],
    additionalProperties: false,
  },
};

export const getAddTaskTools = (
  availableTools: { name: string; description: string }[] = [],
) => ({
  name: getMCPFullToolName({
    server_name: "prostgles",
    name: "add_tools",
  } as const),
  description: fixIndent(`
    For a given task description and the available list of tools, returns a list of tools that can be used to complete the task.
    Available tools: ${availableTools.map((t) => `- ${t.name}: ${t.description}`).join("\n")}
  `),
  input_schema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    required: ["suggested_tools"],
    properties: {
      suggested_tools: {
        type: "array",
        items: {
          type: "object",
          required: ["tool_name"],
          properties: {
            tool_name: {
              type: "string",
              ...(availableTools.length ?
                { enum: availableTools.map((t) => t.name) }
              : {}),
            },
          },
        },
      },
      suggested_prompt: {
        type: "string",
        description:
          "A prompt that describes the task to be completed using the tools.",
      },
    },
  } as any,
});

export const suggestDashboardsTool = {
  name: getMCPFullToolName({
    server_name: "prostgles",
    name: "suggest_dashboards",
  } as const),
  description: "Suggests dashboards based on the provided task description",
  input_schema: {
    type: "object",
    properties: {
      prostglesWorkspaces: {
        type: "array",
        items: {} as any,
      },
    },
  },
};

export const PROSTGLES_MCP_TOOLS = [
  executeSQLTool,
  suggestDashboardsTool,
  getAddTaskTools(),
] as const;
