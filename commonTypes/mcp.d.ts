import type { DBSSchemaForInsert } from "./publishUtils";
export type MCPServerInfo = Omit<DBSSchemaForInsert["mcp_servers"], "id" | "cwd" | "enabled" | "name"> & {
    mcp_server_tools?: Omit<DBSSchemaForInsert["mcp_server_tools"], "id" | "server_name">[];
};
export declare const PROSTGLES_MCP_SERVERS_AND_TOOLS: {
    readonly "prostgles-db-methods": readonly [string];
    readonly "prostgles-db": readonly ["execute_sql"];
    readonly "prostgles-ui": readonly ["suggest_tools_and_prompt", "suggest_dashboards"];
};
type ProstglesMcpTools = typeof PROSTGLES_MCP_SERVERS_AND_TOOLS;
export type ProstglesMcpTool = {
    [K in keyof ProstglesMcpTools]: {
        type: K;
        tool_name: ProstglesMcpTools[K][number];
    };
}[keyof ProstglesMcpTools];
declare const MCP_TOOL_NAME_SEPARATOR = "--";
export declare const getMCPFullToolName: <Name extends string, ServerName extends string>(server_name: ServerName, name: Name) => `${ServerName}--${Name}`;
export declare const getProstglesMCPFullToolName: <ServerName extends "prostgles-db-methods" | "prostgles-db" | "prostgles-ui", Name extends {
    readonly "prostgles-db-methods": readonly [string];
    readonly "prostgles-db": readonly ["execute_sql"];
    readonly "prostgles-ui": readonly ["suggest_tools_and_prompt", "suggest_dashboards"];
}[ServerName][number]>(server_name: ServerName, name: Name) => `${ServerName}--${Name}`;
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
