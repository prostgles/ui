export declare const MCP_SERVERS: {};
import type { DBSSchema } from "./publishUtils";
export declare const DefaultMCPServers: Record<string, Omit<DBSSchema["mcp_servers"], "id" | "created" | "cwd" | "config_schema" | "info" | "name" | "stderr" | "last_updated" | "env"> & {
    env?: Record<string, string>;
}>;
