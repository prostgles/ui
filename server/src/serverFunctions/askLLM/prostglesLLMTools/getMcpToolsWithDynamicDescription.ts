import { isDefined } from "prostgles-types";

import { getMCPToolNameParts } from "@common/mcpUtils";

import type { DBSSchema } from "@common/publishUtils";
import type { DBS } from "@src/index";
import { getProstglesMcpHub } from "@src/McpHub/ProstglesMcpHub/ProstglesMcpHub";
import { getMCPServerTools } from "./getMCPServerTools";

export const getMcpToolsWithDynamicDescription = async ({
  dbs,
  allowedMcpToolsWithInfo,
}: {
  dbs: DBS;
  allowedMcpToolsWithInfo: (Pick<
    DBSSchema["mcp_server_tools"],
    "description" | "mode"
  > & {
    input_schema: any;
    auto_approve: boolean;
    chat_id: number;
    tool_id: number;
    name: `${string}--${string}`;
  })[];
}) => {
  const { mcp_server_tools } = await getMCPServerTools(dbs, {});

  const prostglesMCPHub = await getProstglesMcpHub(dbs);
  const serverEntries = prostglesMCPHub.getServers();
  const prostglesMCPTools = new Map(
    await Promise.all(
      serverEntries.map(async ([name, { fetchTools }]) => {
        const serverToolsMap = await fetchTools(dbs, {
          mcpTools: mcp_server_tools,
          toolsAllowed: allowedMcpToolsWithInfo.map((t) => {
            return {
              tool_id: t.tool_id,
              tool_name: getMCPToolNameParts(t.name)!.toolName,
            };
          }),
        });
        const serverTools = Object.values(serverToolsMap).filter(isDefined);
        const res = [name, serverTools] as const;
        return res;
      }),
    ),
  );

  const mcpTools = allowedMcpToolsWithInfo
    .map((tool) => {
      const toolNameParts = getMCPToolNameParts(tool.name);
      const prostglesMcpTools =
        toolNameParts && prostglesMCPTools.get(toolNameParts.serverName);
      if (toolNameParts && prostglesMcpTools) {
        const matchingTool = prostglesMcpTools.find(
          (ts) => ts.name === toolNameParts.toolName,
        );
        if (!matchingTool) {
          throw new Error(
            `Tool ${tool.name} not found in ${JSON.stringify(toolNameParts.serverName)} server tools`,
          );
        }
        return {
          ...tool,
          input_schema: matchingTool.inputSchema,
          description: matchingTool.description,
        };
      }
      return tool;
    })
    .filter(isDefined);

  return { mcpTools };
};
