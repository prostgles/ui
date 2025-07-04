declare const MCP_TOOL_NAME_SEPARATOR = "--";
export declare const getMCPFullToolName: <Name extends string, ServerName extends string>({ server_name, name, }: {
    server_name: ServerName;
    name: Name;
}) => `${ServerName}--${Name}`;
export declare const getMCPToolNameParts: (fullName: string) => {
    serverName: string;
    toolName: string;
} | undefined;
export declare const executeSQLTool: {
    name: "prostgles--execute_sql";
    description: string;
    input_schema: {
        type: string;
        properties: {
            sql: {
                type: string;
                description: string;
            };
        };
        required: string[];
        additionalProperties: boolean;
    };
};
export declare const getAddTaskTools: (availableTools?: {
    name: string;
    description: string;
}[]) => {
    name: "prostgles--add_tools";
    description: string;
    input_schema: any;
};
export declare const suggestDashboardsTool: {
    name: "prostgles--suggest_dashboards";
    description: string;
    input_schema: {
        type: string;
        properties: {
            prostglesWorkspaces: {
                type: string;
                items: any;
            };
        };
    };
};
export declare const PROSTGLES_MCP_TOOLS: readonly [{
    name: "prostgles--execute_sql";
    description: string;
    input_schema: {
        type: string;
        properties: {
            sql: {
                type: string;
                description: string;
            };
        };
        required: string[];
        additionalProperties: boolean;
    };
}, {
    name: "prostgles--suggest_dashboards";
    description: string;
    input_schema: {
        type: string;
        properties: {
            prostglesWorkspaces: {
                type: string;
                items: any;
            };
        };
    };
}, {
    name: "prostgles--add_tools";
    description: string;
    input_schema: any;
}];
export {};
