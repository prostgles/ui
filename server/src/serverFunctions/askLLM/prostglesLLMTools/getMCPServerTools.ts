import { getMCPFullToolName } from "@common/prostglesMcp";
import type { DBS } from "@src/index";
import type { MCPToolSchema } from "../getLLMToolsAllowedInThisChat";
import type { DBSSchema } from "@common/publishUtils";

export const getMCPServerTools = async (
  dbs: DBS,
  filter: Parameters<typeof dbs.mcp_server_tools.find>[0],
) => {
  const mcp_server_tools = await dbs.mcp_server_tools.find(filter);
  const mcpTools = mcp_server_tools.map((t) => {
    return {
      id: t.id,
      tool_name: t.name,
      server_name: t.server_name,
      name: getMCPFullToolName(t.server_name, t.name),
      description: t.description,
      mode: t.mode,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      input_schema: t.inputSchema,
    } satisfies MCPToolSchema & {
      id: number;
      tool_name: string;
      server_name: string;
      mode: DBSSchema["mcp_server_tools"]["mode"];
    };
  });
  return { mcpTools, mcp_server_tools };
};
