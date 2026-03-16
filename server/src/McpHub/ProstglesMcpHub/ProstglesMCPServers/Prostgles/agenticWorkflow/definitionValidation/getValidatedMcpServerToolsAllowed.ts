import type { DBS } from "@src/index";
import { getKeys, isEmpty } from "prostgles-types";
import type { McpServerToolsAllowed } from "../runtimeSdk/defineAgenticWorkflow";
import { getEntries } from "@common/utils";
import { tout } from "@src/utils/tout";

export const getValidatedMcpServerToolsAllowed = async (
  dbs: DBS,
  toolsFilter: McpServerToolsAllowed | "*",
) => {
  if (isEmpty(toolsFilter)) return [];

  const serverToolNames =
    toolsFilter === "*" ? undefined : (
      getEntries(toolsFilter)
        .map(([server_name, toolNamesObj = {}]) =>
          Object.keys(toolNamesObj).map((name) => ({
            server_name,
            name,
          })),
        )
        .flat()
    );
  const serverNames = toolsFilter === "*" ? undefined : getKeys(toolsFilter);
  if (serverNames) {
    const serversWithNoTools = await dbs.mcp_servers.find({
      name: { $in: serverNames },
      enabled: false,
      $notExistsJoined: {
        mcp_server_tools: {},
      },
    });
    const serversWithNoToolsNames = serversWithNoTools.map((s) => s.name);
    if (serversWithNoToolsNames.length) {
      await dbs.mcp_servers.update(
        { name: { $in: serversWithNoToolsNames } },
        {
          enabled: true,
        },
      );
      /* Wait for tool list to update */
      await tout(4_000);
      await dbs.mcp_servers.update(
        { name: { $in: serversWithNoToolsNames } },
        {
          enabled: false,
        },
      );
    }
  }
  const serverTools = await dbs.mcp_server_tools.find(
    !serverToolNames ?
      {}
    : {
        $or: serverToolNames,
      },
    {
      select: {
        id: 1,
        name: 1,
        server_name: 1,
        inputSchema: 1,
        outputSchema: 1,
        description: 1,
      },
    },
  );

  const workflowToolsWithInfo =
    toolsFilter === "*" ? serverTools : (
      Object.entries(toolsFilter)
        .map(([serverName, toolNamesObj]) => {
          if (!toolNamesObj || isEmpty(toolNamesObj)) {
            throw new Error(
              `MCP Server ${serverName} has no tools specified in workflow allowed tools`,
            );
          }
          const toolsForServer = serverTools.filter(
            (t) => t.server_name === serverName,
          );
          const toolNames = getKeys(toolNamesObj);
          if (!toolNames.length) {
            throw new Error(
              `MCP Server ${serverName} has no tools specified in workflow allowed tools`,
            );
          }
          const tools = toolsForServer.filter((t) =>
            toolNames.includes(t.name),
          );
          if (tools.length !== toolNames.length) {
            throw new Error(
              `Not all tools specified for MCP Server ${serverName} were found. Tools not found: ${toolNames
                .filter((toolName) => !tools.find((t) => t.name === toolName))
                .join(", ")}`,
            );
          }
          return tools;
        })
        .flat()
    );

  return workflowToolsWithInfo;
};
