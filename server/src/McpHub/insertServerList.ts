import type { DBSSchemaForInsert } from "@common/publishUtils";
import { join } from "path";
import type { DBS } from "..";
import { getMCPDirectory } from "./AnthropicMcpHub/installMCPServer";
import { DefaultMCPServers } from "./DefaultMCPServers/DefaultMCPServers";

export const insertServerList = async (dbs: DBS) => {
  const servers = await dbs.mcp_servers.find();
  if (!servers.length) {
    const defaultServers = Object.entries(DefaultMCPServers).map(
      ([name, { ...server }]) => {
        return {
          name,
          cwd:
            server.source ? join(getMCPDirectory(), name) : getMCPDirectory(),
          ...server,
        } satisfies DBSSchemaForInsert["mcp_servers"];
      },
    );
    await dbs.mcp_servers.insert(defaultServers);
  }
};
