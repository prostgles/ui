import { getKeys, includes } from "prostgles-types";
import { DockerSandboxMCPServer } from "./ProstglesMCPServers/DockerSandbox.mcp";
import { WebSearchMCPServer } from "./ProstglesMCPServers/WebSearch.mcp";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
} from "./ProstglesMCPServerTypes";

export const ProstglesMCPServers = {
  "docker-sandbox": DockerSandboxMCPServer,
  websearch: WebSearchMCPServer,
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
