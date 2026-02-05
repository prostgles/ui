import type { DBSSchemaForInsert } from "@common/publishUtils";
import { join } from "path";
import type { DBS } from "..";
import { getMCPDirectory } from "./AnthropicMcpHub/installMCPServer";
import { getDefaultMCPServers } from "./DefaultMCPServers/DefaultMCPServers";

export const insertMcpServerList = async (dbs: DBS) => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!dbs.mcp_servers) {
    // Stale schema
    return;
  }
  const defaultServers = Object.entries(getDefaultMCPServers()).map(
    ([name, { ...server }]) => {
      return {
        name,
        cwd: server.source ? join(getMCPDirectory(), name) : getMCPDirectory(),
        ...server,
      } satisfies DBSSchemaForInsert["mcp_servers"];
    },
  );
  await dbs.mcp_servers.insert(defaultServers, { onConflict: "DoUpdate" });
};
