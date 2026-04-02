import { getKeys, includes } from "prostgles-types";
import { ProstglesUiMCPServer } from "./ProstglesMCPServers/Prostgles.mcp";
import { WebDevMCPServer } from "./ProstglesMCPServers/WebDev/WebDev.mcp";
import { WebSearchMCPServer } from "./ProstglesMCPServers/WebSearch.mcp";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
} from "./ProstglesMCPServerTypes";
import { ProstglesDbMCPServer } from "./ProstglesMCPServers/ProstglesDb.mcp";
import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { DocumentsMCPServer } from "./ProstglesMCPServers/Documents.mcp";

export const ProstglesMCPServers = {
  websearch: WebSearchMCPServer,
  webdev: WebDevMCPServer,
  "prostgles-ui": ProstglesUiMCPServer,
  db: ProstglesDbMCPServer,
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
