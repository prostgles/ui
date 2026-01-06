import { getJSONBSchemaAsJSONSchema, isDefined } from "prostgles-types";

import {
  getMCPFullToolName,
  getMCPToolNameParts,
  getProstglesMCPFullToolName,
  type AllowedChatTool,
} from "@common/prostglesMcp";

import { getProstglesMcpHub } from "@src/McpHub/ProstglesMcpHub/ProstglesMcpHub";
import type { AuthClientRequest } from "prostgles-server/dist/Auth/AuthTypes";
import {
  type GetLLMToolsArgs,
  type MCPToolSchema,
} from "../getLLMToolsAllowedInThisChat";
import { getMCPServerTools } from "./getMCPServerTools";
import { getProstglesDBTools } from "./getProstglesDBTools";
import { getPublishedMethodsTools } from "./getPublishedMethodsTools";
import {
  getAddTaskTools,
  getAddWorkflowTools,
  suggestDashboardsTool,
} from "./prostglesMcpTools";

export const getProstglesLLMTools = async ({
  userType,
  dbs,
  chat,
  prompt,
  mcpToolsWithInfo,
  connectionId,
  clientReq,
}: Omit<GetLLMToolsArgs, "connectionId"> & {
  mcpToolsWithInfo: {
    input_schema: any;
    description: string;
    auto_approve: boolean;
    chat_id: number;
    tool_id: number;
    name: `${string}--${string}`;
    type: "mcp";
  }[];
  connectionId: string;
  clientReq: AuthClientRequest;
}) => {
  const isAdmin = userType === "admin";
  const { prompt_type } = prompt.options ?? {};

  let taskTool:
    | {
        tool_name: "suggest_tools_and_prompt" | "suggest_agent_workflow";
        mcpSchema: MCPToolSchema;
      }
    | undefined = undefined;
  if (prompt_type === "tasks" || prompt_type === "agent_workflow") {
    if (!isAdmin) {
      throw new Error("Only admins can use task creation tools");
    }
    const { published_methods } = await getPublishedMethodsTools(dbs, {
      chatId: chat.id,
      connectionId,
    });
    const { mcp_server_tools } = await getMCPServerTools(dbs, {});
    const [tool_name, getMCPSchema] =
      prompt_type === "tasks" ?
        (["suggest_tools_and_prompt", getAddTaskTools] as const)
      : (["suggest_agent_workflow", getAddWorkflowTools] as const);

    const mcpSchema = getMCPSchema({
      availableMCPTools: mcp_server_tools.map((t) => ({
        ...t,
        name: getMCPFullToolName(t.server_name, t.name),
      })),
      availableDBTools: published_methods.map((t) => ({
        ...t,
        name: getProstglesMCPFullToolName("prostgles-db-methods", t.name),
      })),
    });
    taskTool = {
      tool_name,
      mcpSchema,
    };
  }

  const dbTools = getProstglesDBTools(chat).map((tool) => {
    return {
      ...tool,
      server_name: tool.type,
      input_schema: getJSONBSchemaAsJSONSchema("", "", tool.schema),
    } satisfies AllowedChatTool;
  });

  const uiTools: AllowedChatTool[] = [
    prompt_type === "dashboards" ?
      ({
        ...suggestDashboardsTool,
        auto_approve: true,
        type: "prostgles-ui",
        server_name: "prostgles-ui",
        tool_name: "suggest_dashboards",
      } satisfies AllowedChatTool)
    : undefined,
    taskTool &&
      ({
        ...taskTool.mcpSchema,
        auto_approve: true,
        type: "prostgles-ui",
        server_name: "prostgles-ui",
        tool_name: taskTool.tool_name,
      } satisfies AllowedChatTool),
  ].filter(isDefined);
  const prostglesDBTools: AllowedChatTool[] = [...dbTools, ...uiTools].filter(
    isDefined,
  );

  const prostglesMCPHub = await getProstglesMcpHub(dbs);
  const prostglesMCPTools = await Promise.all(
    mcpToolsWithInfo
      .map(async (tool) => {
        const toolNameParts = getMCPToolNameParts(tool.name);
        const prostglesMcpServer =
          toolNameParts &&
          prostglesMCPHub.getServer(toolNameParts.serverName).server;
        if (toolNameParts && prostglesMcpServer) {
          const prostglesMCPTools = await prostglesMcpServer.fetchTools(dbs, {
            chat_id: chat.id,
            user_id: chat.user_id,
            clientReq,
          });
          const matchingTool = prostglesMCPTools.find(
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
      .filter(isDefined),
  );

  return { prostglesMCPTools, prostglesDBTools };
};
