import type { DBSSchema } from "@common/publishUtils";
import { getEntries } from "@common/utils";
import type { DBS } from "..";
import { connectToMCPServer } from "./connectToMCPServer";
import { fetchMCPServerConfigs } from "./fetchMCPServerConfigs";

export const testMCPServerConfig = async (
  dbs: DBS,
  config: DBSSchema["mcp_server_configs"],
) => {
  const serversConfig = await fetchMCPServerConfigs(dbs, config);
  const [server, ...others] = getEntries(serversConfig);
  if (!server || others.length) {
    throw new Error("Only one MCP server config can be tested at a time");
  }
  const [serverName, fullConfig] = server;
  return (
    await connectToMCPServer({
      name: serverName + "_",
      server_name: fullConfig.server_name,
      config: fullConfig,
      onLog: () => {},
      onTransportClose: () => {},
    })
  ).destroy();
};
