import { getKeys, includes } from "prostgles-types";
import { ProstglesUiMCPServer } from "./ProstglesMCPServers/Ui";
import { WebDevMCPServer } from "./ProstglesMCPServers/WebDev/WebDev.mcp";
import { WebMCPServer } from "./ProstglesMCPServers/Web.mcp";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
} from "./ProstglesMCPServerTypes";
import { DbMcpServer } from "./ProstglesMCPServers/Db.mcp";
import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { DocumentsMCPServer } from "./ProstglesMCPServers/Documents.mcp";

export const ProstglesMCPServers = {
  web: WebMCPServer,
  webdev: WebDevMCPServer,
  "prostgles-ui": ProstglesUiMCPServer,
  db: DbMcpServer,
  documents: DocumentsMCPServer,
} as const satisfies Record<
  string,
  {
    definition: ProstglesMcpServerDefinition;
    handler: ProstglesMcpServerHandler;
  }
>;
export const getProstglesMCPServer = (serverName: string) => {
  if (includes(getKeys(ProstglesMCPServers), serverName)) {
    return ProstglesMCPServers[serverName];
  }
  return undefined;
};

export const getProstglesMCPServerTool = (
  serverName: string,
  toolName: string,
) => {
  const server =
    PROSTGLES_MCP_SERVERS_AND_TOOLS[
      serverName as keyof typeof PROSTGLES_MCP_SERVERS_AND_TOOLS
    ];
  if (toolName in server) {
    return server[toolName as keyof typeof server];
  }
};
