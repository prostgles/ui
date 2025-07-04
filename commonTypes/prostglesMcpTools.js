import { fixIndent } from "./utils";
const MCP_TOOL_NAME_SEPARATOR = "--";
export const getMCPFullToolName = ({ server_name, name, }) => {
    return `${server_name}${MCP_TOOL_NAME_SEPARATOR}${name}`;
};
export const getMCPToolNameParts = (fullName) => {
    const [serverName, toolName] = fullName.split(MCP_TOOL_NAME_SEPARATOR);
    if (serverName && toolName) {
        return { serverName, toolName };
    }
};
export const executeSQLTool = {
    name: getMCPFullToolName({
        server_name: "prostgles",
        name: "execute_sql",
    }),
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
export const getAddTaskTools = (availableTools = []) => ({
    name: getMCPFullToolName({
        server_name: "prostgles",
        name: "add_tools",
    }),
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
                        tool_name: Object.assign({ type: "string" }, (availableTools.length ?
                            { enum: availableTools.map((t) => t.name) }
                            : {})),
                    },
                },
            },
            suggested_prompt: {
                type: "string",
                description: "A prompt that describes the task to be completed using the tools.",
            },
        },
    },
});
export const suggestDashboardsTool = {
    name: getMCPFullToolName({
        server_name: "prostgles",
        name: "suggest_dashboards",
    }),
    description: "Suggests dashboards based on the provided task description",
    input_schema: {
        type: "object",
        properties: {
            prostglesWorkspaces: {
                type: "array",
                items: {},
            },
        },
    },
};
export const PROSTGLES_MCP_TOOLS = [
    executeSQLTool,
    suggestDashboardsTool,
    getAddTaskTools(),
];
