import { getJSONBSchemaAsJSONSchema, isDefined } from "prostgles-types";

import {
  getMCPFullToolName,
  getMCPToolNameParts,
  getProstglesMCPFullToolName,
} from "@common/prostglesMcp";
import { getDockerMCP } from "../../../DockerManager/getDockerMCP";

import {
  type GetLLMToolsArgs,
  type MCPToolSchema,
  type MCPToolSchemaWithApproveInfo,
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

  const dbTools: MCPToolSchemaWithApproveInfo[] = getProstglesDBTools(chat).map(
    (tool) => {
      return {
        ...tool,
        input_schema: getJSONBSchemaAsJSONSchema("", "", tool.schema),
      };
    },
  );

  const prostglesDBTools = [
    ...dbTools,
    prompt_type === "dashboards" ?
      ({
        ...suggestDashboardsTool,
        auto_approve: true,
        type: "prostgles-ui",
        tool_name: "suggest_dashboards",
      } satisfies MCPToolSchemaWithApproveInfo)
    : undefined,
    taskTool &&
      ({
        ...taskTool.mcpSchema,
        auto_approve: true,
        type: "prostgles-ui",
        tool_name: taskTool.tool_name,
      } satisfies MCPToolSchemaWithApproveInfo),
  ].filter(isDefined);

  let mcpToolsWithDocker = mcpToolsWithInfo;
  if (
    mcpToolsWithInfo.some(
      ({ name }) =>
        getMCPToolNameParts(name)?.serverName === getDockerMCP.serverName,
    )
  ) {
    const dockerMCP = await getDockerMCP(dbs, chat);

    mcpToolsWithDocker = mcpToolsWithInfo
      .map((tool) => {
        const toolNameParts = getMCPToolNameParts(tool.name);
        if (
          toolNameParts &&
          toolNameParts.serverName === dockerMCP.serverName
        ) {
          const matchingTool = dockerMCP.toolSchemas.find(
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
  }

  return { mcpToolsWithDocker, prostglesDBTools };
};
