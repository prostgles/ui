import { getKeys, includes } from "prostgles-types";
import { ProstglesUiMCPServer } from "./ProstglesMCPServers/Prostgles.mcp";
import { WebDevMCPServer } from "./ProstglesMCPServers/WebDev/WebDev.mcp";
import { WebSearchMCPServer } from "./ProstglesMCPServers/WebSearch.mcp";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
} from "./ProstglesMCPServerTypes";
import { ProstglesDbMCPServer } from "./ProstglesMCPServers/ProstglesDb.mcp";

export const ProstglesMCPServers = {
  websearch: WebSearchMCPServer,
  webdev: WebDevMCPServer,
  "prostgles-ui": ProstglesUiMCPServer,
  db: ProstglesDbMCPServer,
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
