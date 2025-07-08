import type { DBSSchemaForInsert } from "./publishUtils";
export type MCPServerInfo = Omit<DBSSchemaForInsert["mcp_servers"], "id" | "cwd" | "enabled" | "name"> & {
    mcp_server_tools?: Omit<DBSSchemaForInsert["mcp_server_tools"], "id" | "server_name">[];
};
export declare const PROSTGLES_MCP_SERVERS_AND_TOOLS: {
    readonly "prostgles-db-methods": {
        readonly [x: string]: "";
    };
    readonly "prostgles-db": {
        readonly execute_sql: {
            readonly schema: {
                readonly type: {
                    readonly sql: {
                        readonly type: "string";
                        readonly description: string;
                    };
                };
            };
        };
    };
    readonly "prostgles-ui": {
        readonly suggest_tools_and_prompt: {
            readonly schema: {
                readonly type: {
                    readonly suggested_mcp_tool_names: {
                        readonly description: "List of MCP tools that can be used to complete the task";
                        readonly arrayOf: "string";
                    };
                    readonly suggested_database_tool_names: {
                        readonly description: "List of database tools that can be used to complete the task";
                        readonly arrayOf: "string";
                    };
                    readonly suggested_prompt: {
                        readonly description: "Prompt that will be used in the LLM chat in conjunction with the selected tools to complete the task";
                        readonly type: "string";
                    };
                    readonly suggested_database_access: {
                        readonly description: "If access to the database is needed, an access type can be specified";
                        readonly enum: readonly ["none", "execute_sql_rollback", "execute_sql_commit"];
                    };
                };
            };
        };
        readonly suggest_dashboards: {
            readonly schema: {
                readonly type: {
                    readonly prostglesWorkspaces: {
                        readonly description: "Workspace to create. Must satisfy the typescript WorkspaceInsertModel type";
                        readonly arrayOf: "any";
                    };
                };
            };
        };
    };
};
type ProstglesMcpTools = typeof PROSTGLES_MCP_SERVERS_AND_TOOLS;
export type ProstglesMcpTool = {
    [K in keyof ProstglesMcpTools]: {
        type: K;
        tool_name: keyof ProstglesMcpTools[K];
    };
}[keyof ProstglesMcpTools];
declare const MCP_TOOL_NAME_SEPARATOR = "--";
export declare const getMCPFullToolName: <Name extends string, ServerName extends string>(server_name: ServerName, name: Name) => `${ServerName}--${Name}`;
export declare const getProstglesMCPFullToolName: <ServerName extends "prostgles-db-methods" | "prostgles-db" | "prostgles-ui", Name extends keyof {
    readonly "prostgles-db-methods": {
        readonly [x: string]: "";
    };
    readonly "prostgles-db": {
        readonly execute_sql: {
            readonly schema: {
                readonly type: {
                    readonly sql: {
                        readonly type: "string";
                        readonly description: string;
                    };
                };
            };
        };
    };
    readonly "prostgles-ui": {
        readonly suggest_tools_and_prompt: {
            readonly schema: {
                readonly type: {
                    readonly suggested_mcp_tool_names: {
                        readonly description: "List of MCP tools that can be used to complete the task";
                        readonly arrayOf: "string";
                    };
                    readonly suggested_database_tool_names: {
                        readonly description: "List of database tools that can be used to complete the task";
                        readonly arrayOf: "string";
                    };
                    readonly suggested_prompt: {
                        readonly description: "Prompt that will be used in the LLM chat in conjunction with the selected tools to complete the task";
                        readonly type: "string";
                    };
                    readonly suggested_database_access: {
                        readonly description: "If access to the database is needed, an access type can be specified";
                        readonly enum: readonly ["none", "execute_sql_rollback", "execute_sql_commit"];
                    };
                };
            };
        };
        readonly suggest_dashboards: {
            readonly schema: {
                readonly type: {
                    readonly prostglesWorkspaces: {
                        readonly description: "Workspace to create. Must satisfy the typescript WorkspaceInsertModel type";
                        readonly arrayOf: "any";
                    };
                };
            };
        };
    };
}[ServerName] & string>(server_name: ServerName, name: Name) => `${ServerName}--${Name}`;
export declare const getMCPToolNameParts: (fullName: string) => {
    serverName: string;
    toolName: string;
} | undefined;
export declare const DefaultMCPServers: Record<string, MCPServerInfo>;
export type McpToolCallResponse = {
    _meta?: Record<string, any>;
    content: Array<{
        type: "text";
        text: string;
    } | {
        type: "image" | "audio";
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
export {};
