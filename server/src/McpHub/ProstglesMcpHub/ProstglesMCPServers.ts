import { getKeys, includes } from "prostgles-types";
import { DockerSandboxMCPServer } from "./ProstglesMCPServers/DockerSandbox.mcp";
import { WebDevMCPServer } from "./ProstglesMCPServers/WebDev/WebDev.mcp";
import { WebSearchMCPServer } from "./ProstglesMCPServers/WebSearch.mcp";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
} from "./ProstglesMCPServerTypes";
import { ProstglesUIMCPServer } from "./ProstglesMCPServers/ProstglesUI.mcp";

export const ProstglesMCPServers = {
  "docker-sandbox": DockerSandboxMCPServer,
  websearch: WebSearchMCPServer,
  webdev: WebDevMCPServer,
  "prostgles-ui": ProstglesUIMCPServer,
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
