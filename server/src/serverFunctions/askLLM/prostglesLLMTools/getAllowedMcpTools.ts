import { isDefined } from "prostgles-types";

import { getMCPToolNameParts } from "@common/prostglesMcp";

import type { DBSSchema } from "@common/publishUtils";
import { getProstglesMcpHub } from "@src/McpHub/ProstglesMcpHub/ProstglesMcpHub";
import type { AuthClientRequest } from "prostgles-server/dist/Auth/AuthTypes";
import { type GetLLMToolsArgs } from "../getLLMToolsAllowedInThisChat";
import { getMCPServerTools } from "./getMCPServerTools";

export const getAllowedMcpTools = async ({
  dbs,
  chat,
  allowedMcpToolsWithInfo,
  clientReq,
}: Omit<GetLLMToolsArgs, "connectionId"> & {
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
  clientReq: AuthClientRequest;
}) => {
  const { mcp_server_tools } = await getMCPServerTools(dbs, {});

  const { connection_id } = chat;
  if (!connection_id) {
    throw new Error(`Chat with id ${chat.id} does not have a connection_id`);
  }

  const prostglesMCPHub = await getProstglesMcpHub(dbs);
  const serverEntries = prostglesMCPHub.getServers();
  const prostglesMCPTools = new Map(
    await Promise.all(
      serverEntries.map(async ([name, { fetchTools }]) => {
        const serverToolsMap = await fetchTools(dbs, {
          chat,
          connection_id,
          user_id: chat.user_id,
          clientReq,
          mcpTools: mcp_server_tools,
          toolsAllowed: allowedMcpToolsWithInfo.map((t) => {
            return {
              tool_id: t.tool_id,
              tool_name: getMCPToolNameParts(t.name)!.toolName,
            };
          }),
          dbs,
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
          throw new Error(`Tool ${tool.name} not found in Docker MCP tools`);
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
