import type { DBSSchemaForInsert } from "@common/publishUtils";
import { DBS } from "..";
import { getProstglesMCPServerWithTools } from "./ProstglesMcpHub/ProstglesMCPServers";
import { fetchMCPToolsList } from "./fetchMCPToolsList";
import { startMcpHub, type McpConnection } from "./McpHub";
import { type McpTool } from "./McpTypes";

export const updateMcpServerTools = async (
  dbs: DBS,
  serverName: string,
  client: McpConnection["client"] | undefined,
) => {
  let tools: McpTool[] = [];
  const prostglesMCP = getProstglesMCPServerWithTools(serverName);
  if (prostglesMCP) {
    tools = await prostglesMCP.fetchTools(dbs, undefined);
  } else {
    if (!client) {
      throw new Error(
        `No connection found for MCP server: ${serverName}. Make sure it is enabled`,
      );
    }
    tools = await fetchMCPToolsList(client);
  }

  await dbs.tx(async (tx) => {
    await tx.mcp_server_tools.delete({ server_name: serverName });
    if (tools.length) {
      await tx.mcp_server_tools.insert(
        tools.map(
          ({ name, description, inputSchema, annotations }) =>
            ({
              description: description ?? "",
              server_name: serverName,
              inputSchema,
              name,
              annotations,
            }) satisfies DBSSchemaForInsert["mcp_server_tools"],
        ),
      );
    }
  });
  // const   resources = await fetchMCPResourcesList(client);
  return tools.length;
};

export const reloadMcpServerTools = async (dbs: DBS, serverName: string) => {
  let mcpHub = await startMcpHub(dbs);
  const connection = Object.values(mcpHub.connections).find(
    (c) => c.server_name === serverName,
  );
  let client = connection?.client;
  if (!client) {
    mcpHub = await startMcpHub(dbs, true);
    client = connection?.client;
  }
  return updateMcpServerTools(dbs, serverName, client);
};
