import type { DBSSchemaForInsert } from "./publishUtils";
export type MCPServerInfo = Omit<DBSSchemaForInsert["mcp_servers"], "id" | "cwd" | "enabled" | "name"> & {
    mcp_server_tools?: Omit<DBSSchemaForInsert["mcp_server_tools"], "id" | "server_name">[];
};
export declare const DEFAULT_MCP_SERVER_NAMES: readonly ["filesystem", "fetch", "git", "github", "google-maps", "memory", "playwright", "websearch", "webdev", "slack"];
//# sourceMappingURL=mcp.d.ts.map