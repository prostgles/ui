import { getKeys, includes } from "prostgles-types";
import { DbMcpServer } from "./ProstglesMCPServers/Db.mcp";
import { DocumentsMCPServer } from "./ProstglesMCPServers/Documents.mcp";
import { ProstglesUiMCPServer } from "./ProstglesMCPServers/Ui.mcp";
import { WebMCPServer } from "./ProstglesMCPServers/Web/Web.mcp";
import { WebDevMCPServer } from "./ProstglesMCPServers/WebDev/WebDev.mcp";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
} from "./ProstglesMCPServerTypes";

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
