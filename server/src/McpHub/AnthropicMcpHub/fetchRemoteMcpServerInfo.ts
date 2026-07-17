import type { Client } from "@modelcontextprotocol/sdk/client/index.js";

export const fetchRemoteMcpServerInfo = (client: Client) => {
  const serverVersion = client.getServerVersion();
  const capabilities = client.getServerCapabilities();

  if (serverVersion === undefined && capabilities === undefined) {
    return undefined;
  }

  return {
    serverVersion,
    capabilities,
  };
};
