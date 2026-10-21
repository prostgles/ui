import type { DBSSchema } from "@common/publishUtils";
import type { DBS } from "..";
import { connectToMCPServer } from "./AnthropicMcpHub/connectToMCPServer";
import { getMcpServerParameters } from "./getMcpServerParameters";

export const testMCPServerConfig = async (
  dbs: DBS,
  config: DBSSchema["mcp_server_configs"],
) => {
  const serversConfig = await getMcpServerParameters(dbs, config);
  const [firstServer, ...others] = Array.from(serversConfig.entries());
  if (!firstServer || others.length) {
    throw new Error("Only one MCP server config can be tested at a time");
  }
  const [serverName, fullConfig] = firstServer;
  const instance = await connectToMCPServer({
    name: serverName + "_",
    server_name: fullConfig.server_name,
    parameters: fullConfig,
    onLog: () => {},
    onTransportClose: () => {},
  });
  if (!instance.success) {
    throw new Error(
      `Failed to connect to MCP server "${fullConfig.server_name}": ${instance.error}`,
    );
  }
  return instance.connection.destroy();
};
