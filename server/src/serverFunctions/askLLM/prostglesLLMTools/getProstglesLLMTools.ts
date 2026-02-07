import { getJSONBSchemaAsJSONSchema, isDefined } from "prostgles-types";

import {
  getMCPToolNameParts,
  type AllowedChatTool,
} from "@common/prostglesMcp";

import { getProstglesMcpHub } from "@src/McpHub/ProstglesMcpHub/ProstglesMcpHub";
import type { AuthClientRequest } from "prostgles-server/dist/Auth/AuthTypes";
import { type GetLLMToolsArgs } from "../getLLMToolsAllowedInThisChat";
import { getAllowedDBToolSchemas } from "./getAllowedDBToolSchemas";
import { getMCPServerTools } from "./getMCPServerTools";
import type { DBSSchema } from "@common/publishUtils";

export const getProstglesLLMTools = async ({
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
    type: "mcp";
  })[];
  clientReq: AuthClientRequest;
}) => {
  const { mcp_server_tools } = await getMCPServerTools(dbs, {});

  const dbTools = getAllowedDBToolSchemas(chat).map((tool) => {
    return {
      ...tool,
      server_name: tool.type,
      input_schema: getJSONBSchemaAsJSONSchema("", "", tool.schema),
      mode: null,
    } satisfies AllowedChatTool;
  });

  const prostglesMCPHub = await getProstglesMcpHub(dbs);
  const serverEntries = prostglesMCPHub.getServers();
  const prostglesMCPTools = new Map(
    await Promise.all(
      serverEntries.map(async ([name, { fetchTools }]) => {
        const serverTools = await fetchTools(dbs, {
          chat_id: chat.id,
          user_id: chat.user_id,
          clientReq,
          dbTools: getAllowedDBToolSchemas(chat),
          chat,
          mcpTools: mcp_server_tools,
          toolsAllowed: allowedMcpToolsWithInfo.map((t) => {
            return {
              tool_id: t.tool_id,
              tool_name: getMCPToolNameParts(t.name)!.toolName,
            };
          }),
        });
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

  return { mcpTools, dbTools };
};
