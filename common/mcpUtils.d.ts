import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "./prostglesMcp";
import type { DBSSchema } from "./publishUtils";
declare const MCP_TOOL_NAME_SEPARATOR = "--";
export declare const getMCPFullToolName: <Name extends string, ServerName extends string>(server_name: ServerName, name: Name) => `${ServerName}${typeof MCP_TOOL_NAME_SEPARATOR}${Name}`;
export type ProstglesDbTools = (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["db"];
type ProstglesMcpTools = typeof PROSTGLES_MCP_SERVERS_AND_TOOLS;
export type ProstglesMcpTool = {
    [K in keyof ProstglesMcpTools]: {
        type: K;
        tool_name: keyof ProstglesMcpTools[K];
    };
}[keyof ProstglesMcpTools];
export declare const getProstglesMCPFullToolName: <ServerName extends keyof ProstglesMcpTools, Name extends keyof ProstglesMcpTools[ServerName] & string>(server_name: ServerName, name: Name) => `${ServerName}--${Name}`;
export declare const getMCPToolNameParts: (fullName: string) => {
    serverName: string;
    toolName: string;
} | undefined;
export type AllowedChatTool = Pick<DBSSchema["mcp_server_tools"], "server_name" | "mode" | "description"> & {
    tool_id: number;
    name: string;
    tool_name: string;
    input_schema: any;
    auto_approve: boolean;
};
import type { DBSSchemaForInsert } from "./publishUtils";
export type MCPServerInfo = Omit<DBSSchemaForInsert["mcp_servers"], "id" | "cwd" | "enabled" | "name"> & {
    mcp_server_tools?: Omit<DBSSchemaForInsert["mcp_server_tools"], "id" | "server_name">[];
};
export declare const DEFAULT_MCP_SERVER_NAMES: readonly ["filesystem", "fetch", "git", "github", "google-maps", "memory", "playwright", "websearch", "webdev", "slack"];
export {};
//# sourceMappingURL=mcpUtils.d.ts.map