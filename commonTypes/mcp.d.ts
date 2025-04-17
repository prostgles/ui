import type { DBSSchema, DBSSchemaForInsert } from "./publishUtils";
export type MCPServerInfo = Omit<DBSSchemaForInsert["mcp_servers"], "id" | "cwd" | "enabled" | "name"> & {
    mcp_server_tools?: Omit<DBSSchemaForInsert["mcp_server_tools"], "id" | "server_name">[];
};
export declare const DefaultMCPServers: Record<string, MCPServerInfo>;
export declare const getMCPFullToolName: ({ server_name, name, }: Pick<DBSSchema["mcp_server_tools"], "server_name" | "name">) => `${string}-${string}`;
export declare const getMCPToolNameParts: (fullName: string) => {
    serverName: string;
    toolName: string;
} | undefined;
export type McpToolCallResponse = {
    _meta?: Record<string, any>;
    content: Array<{
        type: "text";
        text: string;
    } | {
        type: "image";
        data: string;
        mimeType: string;
    } | {
        type: "resource";
        resource: {
            uri: string;
            mimeType?: string;
            text?: string;
            blob?: string;
        };
    }>;
    isError?: boolean;
};
export declare const execute_sql_tool: {
    readonly name: `${string}-${string}`;
    readonly description: "Run SQL query on the current database";
    readonly input_schema: {
        readonly type: "object";
        readonly properties: {
            readonly sql: {
                readonly type: "string";
                readonly description: "SQL query to execute";
            };
        };
        readonly required: readonly ["sql"];
        readonly additionalProperties: false;
    };
};
export declare const getChoose_tools_for_task: (toolNames?: string[]) => {
    name: `${string}-${string}`;
    description: string;
    input_schema: {
        $id: string;
        $schema: string;
        type: string;
        required: string[];
        properties: {
            suggested_tools: {
                type: string;
                items: {
                    type: string;
                    required: string[];
                    properties: {
                        tool_name: {
                            enum?: string[] | undefined;
                            type: string;
                        };
                    };
                };
            };
        };
    };
};
export declare const PROSTGLES_MCP_TOOLS: readonly [{
    readonly name: `${string}-${string}`;
    readonly description: "Run SQL query on the current database";
    readonly input_schema: {
        readonly type: "object";
        readonly properties: {
            readonly sql: {
                readonly type: "string";
                readonly description: "SQL query to execute";
            };
        };
        readonly required: readonly ["sql"];
        readonly additionalProperties: false;
    };
}, {
    name: `${string}-${string}`;
    description: string;
    input_schema: {
        $id: string;
        $schema: string;
        type: string;
        required: string[];
        properties: {
            suggested_tools: {
                type: string;
                items: {
                    type: string;
                    required: string[];
                    properties: {
                        tool_name: {
                            enum?: string[] | undefined;
                            type: string;
                        };
                    };
                };
            };
        };
    };
}];
