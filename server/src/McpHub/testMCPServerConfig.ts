import type { DBSSchema } from "@common/publishUtils";
import type { DBS } from "..";
import { connectToMCPServer } from "./AnthropicMcpHub/connectToMCPServer";
import { fetchMCPServerConfigs } from "./fetchMCPServerConfigs";

export const testMCPServerConfig = async (
  dbs: DBS,
  config: DBSSchema["mcp_server_configs"],
) => {
  const serversConfig = await fetchMCPServerConfigs(dbs, config);
  const [firstServer, ...others] = Array.from(serversConfig.entries());
  if (!firstServer || others.length) {
    throw new Error("Only one MCP server config can be tested at a time");
  }
  const [serverName, fullConfig] = firstServer;
  return (
    await connectToMCPServer({
      name: serverName + "_",
      server_name: fullConfig.server_name,
      parameters: fullConfig,
      onLog: () => {},
      onTransportClose: () => {},
    })
  ).destroy();
};
