import { getEntries } from "@common/utils";
import type { DBS } from "@src/index";
import type { ToolDefinition } from "./defineAgenticWorkflow";
import { callMCPServerTool } from "@src/McpHub/callMCPServerTool";
import { getKeys, isEmpty } from "prostgles-types";
import { getMCPFullToolName } from "@common/prostglesMcp";
import type { AuthClientRequest } from "prostgles-server";

export const getValidatedWorkflowTools = async ({
  chatId,
  dbs,
  userId,
  workflowAllowedTools,
  toolDefinitions = {},
}: {
  dbs: DBS;
  chatId: number;
  userId: string;
  workflowAllowedTools: Record<string, Record<string, 1>> | undefined;
  toolDefinitions: Record<string, ToolDefinition> | undefined;
}) => {
  const validatedTools = new Map(
    await Promise.all(
      getEntries(toolDefinitions).map(
        async ([workflowToolName, { mcpServerName, toolNames }]) => {
          const configId = undefined;
          // if (configId !== undefined) {
          //   const mcpServerConfig = await dbs.mcp_server_configs.findOne({
          //     id: configId,
          //     server_name: mcpServerName,
          //   });
          //   if (!mcpServerConfig) {
          //     throw new Error(
          //       `MCP Server config with id ${configId} for server ${mcpServerName} not found for workflow tool ${workflowToolName}`,
          //     );
          //   }
          // }
          const serverTools = await dbs.mcp_server_tools.find(
            {
              server_name: mcpServerName,
              name: { $in: toolNames },
            },
            {
              select: {
                id: 1,
                name: 1,
                server_name: 1,
                inputSchema: 1,
                outputSchema: 1,
              },
            },
          );
          if (serverTools.length !== toolNames.length) {
            throw new Error(
              `Could not find all specified tools for workflow tool definition ${JSON.stringify(workflowToolName)}. Tools not found: ${toolNames
                .filter((tn) => !serverTools.find((st) => st.name === tn))
                .join(", ")}`,
            );
          }
          return [workflowToolName, { configId, serverTools }] as const;
        },
      ),
    ),
  );

  const workflowTools =
    !workflowAllowedTools || isEmpty(workflowAllowedTools) ?
      []
    : getEntries(workflowAllowedTools)
        .map(([serverName, toolNamesObj]) => {
          const toolNames = getKeys(toolNamesObj);
          return toolNames.map((toolName) => ({
            toolName,
            serverName,
          }));
        })
        .flat();

  const toolsWithInfo =
    !workflowTools.length ?
      []
    : await dbs.mcp_server_tools.find(
        {
          $or: workflowTools.map(({ serverName, toolName }) => ({
            server_name: serverName,
            name: toolName,
          })),
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

  if (toolsWithInfo.length !== workflowTools.length) {
    throw new Error(
      `Could not find all specified tools for workflow allowed tools. Tools not found: ${workflowTools
        .filter(
          ({ serverName, toolName }) =>
            !toolsWithInfo.find(
              (t) => t.server_name === serverName && t.name === toolName,
            ),
        )
        .map(({ serverName, toolName }) => `${serverName}--${toolName}`)
        .join(", ")}`,
    );
  }

  const workflowToolsHandler = new Map<
    string,
    (
      args: Record<string, unknown> | undefined,
      clientReq: AuthClientRequest,
    ) => Promise<unknown>
  >();
  toolsWithInfo.forEach(({ name, server_name }) => {
    const fullToolName = getMCPFullToolName(server_name, name);
    workflowToolsHandler.set(fullToolName, (args, clientReq) => {
      return callMCPServerTool(
        { id: userId },
        chatId,
        dbs,
        server_name,
        name,
        args,
        clientReq,
      );
    });
  });

  return { validatedTools, workflowToolsHandler };
};
