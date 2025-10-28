import {
  getJSONBSchemaAsJSONSchema,
  isDefined,
  type JSONB,
} from "prostgles-types";
import type { DBS } from "../../..";

import {
  getMCPFullToolName,
  getMCPToolNameParts,
  getProstglesMCPFullToolName,
} from "@common/prostglesMcp";
import { getDockerMCP } from "../../../DockerManager/getDockerMCP";

import type {
  GetLLMToolsArgs,
  MCPToolSchema,
  MCPToolSchemaWithApproveInfo,
} from "../getLLMTools";
import { getAddTaskTools, suggestDashboardsTool } from "./prostglesMcpTools";
import { getProstglesDBTools } from "./getProstglesDBTools";

export const getProstglesLLMTools = async ({
  userType,
  dbs,
  chat,
  prompt,
  mcpToolsWithInfo,
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
}) => {
  const isAdmin = userType === "admin";
  const { prompt_type } = prompt.options ?? {};

  let taskTool: MCPToolSchema | undefined = undefined;
  if (prompt_type === "tasks") {
    if (!isAdmin) {
      throw new Error("Only admins can use task creation tools");
    }
    const { published_methods } = await getPublishedMethodsTools(dbs, {});
    const { mcp_server_tools } = await getMCPServerTools(dbs, {});
    taskTool = getAddTaskTools({
      availableMCPTools: mcp_server_tools.map((t) => ({
        ...t,
        name: getMCPFullToolName(t.server_name, t.name),
      })),
      availableDBTools: published_methods.map((t) => ({
        ...t,
        name: getProstglesMCPFullToolName("prostgles-db-methods", t.name),
      })),
    });
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
        ...taskTool,
        auto_approve: true,
        type: "prostgles-ui",
        tool_name: "suggest_tools_and_prompt",
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

const getMCPServerTools = async (
  dbs: DBS,
  filter: Parameters<typeof dbs.mcp_server_tools.find>[0],
) => {
  const mcp_server_tools = await dbs.mcp_server_tools.find(filter);
  const mcpTools = mcp_server_tools.map((t) => {
    return {
      id: t.id,
      name: getMCPFullToolName(t.server_name, t.name),
      description: t.description,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      input_schema: t.inputSchema,
    } satisfies MCPToolSchema & { id: number };
  });
  return { mcpTools, mcp_server_tools };
};

const getPublishedMethodsTools = async (
  dbs: DBS,
  filter: Parameters<typeof dbs.published_methods.find>[0],
) => {
  const published_methods = await dbs.published_methods.find(filter);
  const serverSideFuncTools = published_methods.map((m) => {
    const { name, description, arguments: _arguments, id } = m;
    const properties = _arguments.reduce(
      (acc, arg) => ({
        ...acc,
        [arg.name]:
          (
            arg.type === "JsonbSchema" ||
            arg.type === "Lookup" ||
            arg.type === "Lookup[]"
          ) ?
            "any"
          : arg.type,
      }),
      {} as JSONB.ObjectType["type"],
    );
    return {
      id,
      tool_name: name,
      name: getProstglesMCPFullToolName("prostgles-db-methods", name),
      description,
      input_schema: getJSONBSchemaAsJSONSchema(
        "published_methods",
        "arguments",
        {
          type: properties,
        },
      ),
    } satisfies MCPToolSchema & { id: number; tool_name: string };
  });
  return { serverSideFuncTools, published_methods };
};
