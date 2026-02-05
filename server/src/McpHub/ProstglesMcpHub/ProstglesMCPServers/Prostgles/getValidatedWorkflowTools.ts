import { getEntries } from "@common/utils";
import type { DBS } from "@src/index";
import type { ToolDefinition } from "./defineAgenticWorkflow";

export const getValidatedWorkflowTools = async (
  toolDefinitions: Record<string, ToolDefinition>,
  dbs: DBS,
) => {
  const validatedTools = new Map(
    await Promise.all(
      getEntries(toolDefinitions).map(
        async ([toolName, { configId, mcpServerName, toolNames }]) => {
          if (configId !== undefined) {
            const mcpServerConfig = await dbs.mcp_server_configs.findOne({
              id: configId,
              server_name: mcpServerName,
            });
            if (!mcpServerConfig) {
              throw new Error(
                `MCP Server config with id ${configId} for server ${mcpServerName} not found for tool ${toolName}`,
              );
            }
          }
          const serverTools = await dbs.mcp_server_tools.find(
            {
              $and: [
                { name: toolName },
                {
                  server_name: mcpServerName,
                  name: { $in: toolNames },
                },
              ],
            },
            {
              select: { id: 1, name: 1, server_name: 1 },
            },
          );
          if (serverTools.length !== toolNames.length) {
            throw new Error(
              `Could not find all specified tools for tool definition ${JSON.stringify(toolName)}. Tools not found: ${toolNames
                .filter((tn) => !serverTools.find((st) => st.name === tn))
                .join(", ")}`,
            );
          }
          return [toolName, { configId, serverTools }] as const;
        },
      ),
    ),
  );
  return { validatedTools };
};
