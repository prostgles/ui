import type { DBSSchema, DBSSchemaForInsert } from "./publishUtils";
export type MCPServerInfo = Omit<DBSSchemaForInsert["mcp_servers"], "id" | "cwd" | "enabled" | "name"> & {
    mcp_server_tools?: Omit<DBSSchemaForInsert["mcp_server_tools"], "id" | "server_name">[];
};
export declare const DefaultMCPServers: Record<string, MCPServerInfo>;
export declare const getMCPFullToolName: ({ server_name, name, }: Pick<DBSSchema["mcp_server_tools"], "server_name" | "name">) => string;
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
