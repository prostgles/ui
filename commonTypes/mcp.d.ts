export declare const MCP_SERVERS: {};
import type { DBSSchema } from "./publishUtils";
export declare const DefaultMCPServers: Record<string, Omit<DBSSchema["mcp_servers"], "id" | "created" | "cwd" | "config_schema" | "enabled" | "info" | "name" | "stderr" | "last_updated" | "env"> & Pick<DBSSchema["mcp_servers"], "env"> & {
    mcp_server_tools?: Omit<DBSSchema["mcp_server_tools"], "id" | "server_name">[];
}>;
