import type { DBSSchema } from "@common/publishUtils";
import { getEntries } from "@common/utils";
import type { DBS } from "@src/index";
import { getProstglesMcpHub } from "@src/McpHub/ProstglesMcpHub/ProstglesMcpHub";
import { tout } from "@src/utils/tout";
import { getKeys, isDefined, isEmpty } from "prostgles-types";
import type { McpServerToolsAllowed } from "../runtimeSdk/defineAgenticWorkflow";
import type { ProstglesMcpServerHandlerInstance } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServerTypes";

export const getValidatedMcpServerToolsAllowed = async (
  dbs: DBS,
  toolsFilter: McpServerToolsAllowed | "*",
  serverConfigs: NonNullable<
    DBSSchema["agentic_workflows"]["definition_override"]
  >["orchestratorMcpServerConfigs"],
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
  const requestedServerNames =
    toolsFilter === "*" ? undefined : getKeys(toolsFilter);
  if (requestedServerNames) {
    const serversWithNoTools = await dbs.mcp_servers.find({
      name: { $in: requestedServerNames },
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
  const serverToolsWithDefaultDescriptions = await dbs.mcp_server_tools.find(
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

  const serverNames = Array.from(
    new Set(serverToolsWithDefaultDescriptions.map((t) => t.server_name)),
  );
  const prglMcpHub = await getProstglesMcpHub(dbs);

  /** Add dynamic tool descriptions/schema */
  const dynamicToolInfo = new Map(
    (
      await Promise.all(
        serverNames.map(async (serverName) => {
          const prglMcpServer = prglMcpHub.getServer(serverName) as {
            server?: ProstglesMcpServerHandlerInstance;
          };
          if (!prglMcpServer.server) {
            return undefined;
          }
          const toolSchemas = await prglMcpServer.server.fetchTools(dbs, {
            mcpTools: serverToolsWithDefaultDescriptions,
            toolsAllowed: serverToolsWithDefaultDescriptions.map((t) => ({
              tool_id: t.id,
              tool_name: t.name,
            })),
          });
          return [serverName, toolSchemas] as const;
        }),
      )
    ).filter(isDefined),
  );

  const serverTools = serverToolsWithDefaultDescriptions.map((tool) => {
    const toolInfo = dynamicToolInfo.get(tool.server_name)?.[tool.name];
    return {
      ...tool,
      description: toolInfo?.description || tool.description,
    };
  });

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

  const toolsWithServerConfig = workflowToolsWithInfo.map((tool) => {
    const configForServer = serverConfigs?.[tool.server_name];

    return {
      ...tool,
      ...configForServer,
    };
  });
  return toolsWithServerConfig;
};
