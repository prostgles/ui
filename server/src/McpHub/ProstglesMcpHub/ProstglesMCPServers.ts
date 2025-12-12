import { getKeys, includes } from "prostgles-types";
import { DockerSandboxMCPServer } from "./ProstglesMCPServers/DockerSandbox.mcp";
import { WebSearchMCPServer } from "./ProstglesMCPServers/WebSearch.mcp";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
} from "./ProstglesMCPServerTypes";

export const ProstglesMCPServers: Record<
  string,
  {
    definition: ProstglesMcpServerDefinition;
    handler: ProstglesMcpServerHandler;
  }
> = {
  "docker-sandbox": DockerSandboxMCPServer,
  "web-search": WebSearchMCPServer,
};
export const getProstglesMCPServer = (serverName: string) => {
  if (includes(getKeys(ProstglesMCPServers), serverName)) {
    return ProstglesMCPServers[serverName];
  }
  return undefined;
};
