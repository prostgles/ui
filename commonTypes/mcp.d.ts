export declare const MCP_SERVERS: {};
import type { DBSSchemaForInsert } from "./publishUtils";
export declare const DefaultMCPServers: Record<string, Omit<DBSSchemaForInsert["mcp_servers"], "id" | "cwd" | "enabled" | "name"> & {
    mcp_server_tools?: Omit<DBSSchemaForInsert["mcp_server_tools"], "id" | "server_name">[];
}>;
