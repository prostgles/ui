import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "./prostglesMcp";
import type { DBSSchema } from "./publishUtils";

const MCP_TOOL_NAME_SEPARATOR = "--";
export const getMCPFullToolName = <
  Name extends string,
  ServerName extends string,
>(
  server_name: ServerName,
  name: Name,
): `${ServerName}${typeof MCP_TOOL_NAME_SEPARATOR}${Name}` | Name => {
  return !server_name ? name : (
      (`${server_name}${MCP_TOOL_NAME_SEPARATOR}${name}` as const)
    );
};

export type ProstglesDbTools = (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["db"];
type ProstglesMcpTools = typeof PROSTGLES_MCP_SERVERS_AND_TOOLS;
export type ProstglesMcpTool = {
  [K in keyof ProstglesMcpTools]: {
    type: K;
    tool_name: keyof ProstglesMcpTools[K];
  };
}[keyof ProstglesMcpTools];

export const getProstglesMCPFullToolName = <
  ServerName extends keyof ProstglesMcpTools,
  Name extends keyof ProstglesMcpTools[ServerName] & string,
>(
  server_name: ServerName,
  name: Name,
) => getMCPFullToolName(server_name, name);

export const getMCPToolNameParts = (fullName: string) => {
  const [serverName, toolName] = fullName.split(MCP_TOOL_NAME_SEPARATOR);
  if (serverName && toolName) {
    return { serverName, toolName };
  }
};

export type AllowedChatTool = Pick<
  DBSSchema["mcp_server_tools"],
  "server_name" | "mode" | "description"
> & {
  tool_id: number;
  name: string;
  tool_name: string;
  input_schema: any;
  auto_approve: boolean;
};

import type { DBSSchemaForInsert } from "./publishUtils";

export type MCPServerInfo = Omit<
  DBSSchemaForInsert["mcp_servers"],
  "id" | "cwd" | "enabled" | "name"
> & {
  mcp_server_tools?: Omit<
    DBSSchemaForInsert["mcp_server_tools"],
    "id" | "server_name"
  >[];
};

export const DEFAULT_MCP_SERVER_NAMES = [
  "filesystem",
  "git",
  "github",
  "google-maps",
  "memory",
  "playwright",
  "web",
  "webdev",
  "slack",
] as const;
